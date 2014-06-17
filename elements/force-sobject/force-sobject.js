(function(SFDC) {

    var viewProps = {
        sobject: null,
        recordid: null,
        fieldlist: null,
        autosync: true,
        mergemode: Force.MERGE_MODE.OVERWRITE
    };

    var createModel = function(sobject) {
        sobject = sobject.toLowerCase();

        return new (Force.SObject.extend({
            cacheMode: SFDC.cacheMode,
            sobjectType: sobject.toLowerCase(),
            idAttribute: sobject.search(/__x$/) > 0 ? 'ExternalId' : 'Id'
        }));
    }

    var SObjectViewModel = function(model) {
        var _self = this;

        var setupProps = function(props) {
            props.forEach(function(prop) {
                Object.defineProperty(_self, prop, {
                    get: function() {
                        return model.get(prop);
                    },
                    set: function(val) {
                        model.set(prop, val);
                    },
                    enumerable: true
                });
            });
        }
        setupProps(_.union(_.keys(model.attributes), model.fieldlist));

        // Setup an event listener to update properties whenever model attributes change
        model.on('change', function() {
            setupProps(_.difference(_.keys(model.attributes), _.keys(_self)));
        });
    }

    function processFieldlist(fieldlist) {
        if (typeof fieldlist === 'string')
            return fieldlist.trim().split(/\s+/);
        else
            return fieldlist;
    }

    Polymer('force-sobject', _.extend({}, viewProps, {
        observe: {
            sobject: "init",
            recordid: "init",
            fieldlist: "init"
        },
        // Resets all the properties on the model.
        // Recreates model if sobject type or id of model has changed.
        init: function() {
            var that = this,
                model;

            if (this.sobject && typeof this.sobject === 'string') {
                that._changedAttributes = [];
                model = this._model = createModel(this.sobject);
                model.set(model.idAttribute, this.recordid);
                model.fieldlist = processFieldlist(this.fieldlist);
                model.set({attributes: {type: this.sobject}});
                model.on('all', function(event) {
                    switch(event) {
                        case 'change':
                            var changedFields = _.keys(model.changedAttributes());
                            changedFields = changedFields.filter(function(field) {
                                return field.indexOf('__') != 0;
                            })
                            that._changedAttributes = _.union(that._changedAttributes, changedFields);
                            break;
                        case 'sync': that._changedAttributes = [];
                    }
                    that.fire(event);
                });

                this.fields = new SObjectViewModel(model);
                if (this.autosync) this.fetch();
            }
        },
        // All CRUD operations should ensure that the model is ready by checking this promise.
        whenModelReady: function() {
            var model = this._model;
            var store = this.$.store;
            return $.when(store.cacheReady, SFDC.launcher)
                .then(function() {
                    model.cache = store.cache;
                    model.cacheForOriginals = store.cacheForOriginals;
                });
        },
        fetch: function(opts) {

            var operation = function() {
                var model = this._model;
                if (model && model.id) {
                    this.whenModelReady().then(function() {
                        model.fetch(opts);
                    });
                } else if (!this.autosync) {
                    //if sync was not auto initiated, trigger a 'invalid' event
                    this.fire('invalid', 'sobject Type and recordid required for fetch.');
                }
            }
            // Queue the operation for next cycle after all change watchers are fired.
            this.async(operation.bind(this));
            return this;
        },
        /*
        * If the model was modified locally, it saves all the updateable fields on the sobject back to server. 
        * If fieldlist property is specified on the options, 
        * all the specified fields are also included during the save operation.
        */
        save: function(options) {

            var operation = function() {
                var that = this,
                    model = that._model;

                options = _.extend({
                    mergeMode: this.mergemode,
                    fieldlist: this._changedAttributes
                }, options);

                var successCB = options.success;
                options.success = function() {
                    that.recordid = model.id;
                    that.fire('save');
                    if (successCB) successCB(arguments);
                }

                var getEditableFieldList = function() {
                    return SFDC.getSObjectType(that.sobject)
                        .describe()
                        .then(function(describeResult) {

                            return _.pluck(_.filter(describeResult.fields, function(fieldInfo) {
                                return fieldInfo.updateable;
                            }), "name");
                        });
                }

                if (model) {
                    this.whenModelReady().then(function() {
                        // Check if the record was modified locally and the current save operation is not cache only.
                        // If yes, we will need to send all the updateable fields for save to server.

                        var cacheMode = options.cacheMode || model.cacheMode;
                        cacheMode = _.isFunction(cacheMode) ? cacheMode('save') : cacheMode;

                        if (model.get('__local__') && cacheMode != Force.CACHE_MODE.CACHE_ONLY) {
                            // Get all the updatable fields and union them with the list provided by the user.
                            return getEditableFieldList().then(function(fieldlist) {
                                options.fieldlist = _.union(
                                    _.intersection(_.keys(model.attributes), fieldlist),
                                    options.fieldlist || []
                                );
                            });
                        }
                    }).then(function() {
                        // Perform save (upsert) against the server
                        model.save(null, options);
                    });
                } else if (!this.autosync) {
                    //if sync was not auto initiated, trigger a 'invalid' event
                    this.fire('invalid', 'sobject Type required for save.');
                }
            }

            // Queue the operation for next cycle after all change watchers are fired.
            this.async(operation.bind(this));
            return this;
        },
        destroy: function(options) {

            var operation = function() {
                var model = this._model;
                options = _.extend({mergeMode: this.mergemode}, options);
                if (model && model.id) {
                    this.whenModelReady().then(function() {
                        // Perform delete of record against the server
                        model.destroy(options);
                    });
                } else if (!this.autosync) {
                    //if sync was not auto initiated, trigger a 'invalid' event
                    this.fire('invalid', 'sobject Type and recordid required for delete.');
                }
            }

            // Queue the operation for next cycle after all change watchers are fired.
            this.async(operation.bind(this));
            return this;
        }
    }));

})(window.SFDC);
