(function(SFDC) {

    "use strict";

    var viewProps = {
        sobject: null,
        query: "",
        querytype: "mru",
        maxsize: -1,
        pagesize: 25,
        autosync: true
        /* async: false */ // Optional property to perform fetch as a web worker operation. Useful for data priming.
    };

    var generateConfig = function(props) {
        var config = {};

        // Fetch if only sobject type is specified.
        if (props.sobject && typeof props.sobject === 'string') {
            config.sobjectType = props.sobject;
            // Is device offline and smartstore is available
            if (!SFDC.isOnline() && navigator.smartstore) {
                // Only run cache queries. If none provided, fetch all data.
                config.type = 'cache';
                if (props.querytype == 'cache' && props.query) config.cacheQuery = props.query;
                else config.cacheQuery = navigator.smartstore.buildAllQuerySpec('attributes.type');
            } 
            /* Query must be specified if Querytype is not mru */
            else if (props.querytype == 'mru' || (props.querytype && props.query)) {

                // Send the user config for fetch
                config.type = props.querytype;
                if (props.querytype == 'cache') config.cacheQuery = props.query;
                else config.query = props.query;
            }
        }
        return (config.type) ? config : null;
    }

    //TBD: Make collection a private property. Then expose sobjects property which contains the array of models wrapped into SObjectViewModel.
    Polymer('force-sobject-collection', _.extend({}, viewProps, {
        observe: {
            sobject: "reset",
            query: "reset",
            querytype: "reset"
        },
        ready: function() {
            this.collection = new Force.SObjectCollection();
            this.collection.on('all', function(event) {
                this.fire(event);
            }.bind(this));
            this.models = [];
            this.resetCount = 0;
        },

        reset: function() {
            this.collection.config = generateConfig(_.pick(this, _.keys(viewProps)));
            this.collection.reset();
            this.models = [];
            this.resetCount++;
            if (this.autosync) this.fetch();
        },

        fetch: function() {
            var collection = this.collection;
            var config = collection.config;
            var query = config.query;
            var resetCount = this.resetCount; // captured for closure below
            var offset = 0;

            var limitSoql = function(soql, offset, pagesize) {
                return soql + ' LIMIT ' + pagesize + ' OFFSET ' + offset;
            };

            var onFetch = function() {
                if (this.resetCount > resetCount) {
                    // This is an old query -- ignore
                    return;
                }

                if (collection.length == 0) {
                    // Nothing came back 
                    return;
                }

                _.each(collection.models, function(record) {
                    this.models.push(record);
                }.bind(this));

                if (config.type == "soql" && (offset+this.pagesize) < this.maxsize) {
                    offset += this.pagesize;
                    config.query = limitSoql(query, offset, this.pagesize);
                    this.collection.fetch({ reset:true, success: onFetch});
                }
            }.bind(this);

            var operation = function() {
                var store = this.$.store;

                if (config) {
                    // Append limit if soql and maxsize was provided
                    if (config.type == "soql" && this.maxsize > 0) {
                        config.query = limitSoql(query, offset, this.pagesize);
                    }

                    // Define the collection model type. Set the idAttribute to 'ExternalId' if sobject is external object.
                    collection.model = Force.SObject.extend({
                        idAttribute: this.sobject.toLowerCase().search(/__x$/) > 0 ? 'ExternalId' : 'Id'
                    });

                    $.when(store.cacheReady, SFDC.launcher)
                    .done(function() {
                        collection.cache = store.cache;
                        collection.cacheForOriginals = store.cacheForOriginals;
                        collection.fetch({ reset: true, success: onFetch, config:config });
                    });
                }
            }.bind(this);

            // Queue the operation for next cycle after all change watchers are fired.
            this.async(operation);
        }
    }));

})(window.SFDC);