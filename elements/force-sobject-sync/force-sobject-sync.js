(function(SFDC) {

    "use strict";

    var viewProps = {
        sobject: null,
        query: "",
        maxsize: -1,
        pagesize: 2000
    };

    Polymer('force-sobject-sync', _.extend({}, viewProps, {
        ready: function() {
            var store = this.$.store;
            var that = this;

            $.when(store.cacheReady, SFDC.launcher)
            .then(function() {
                cordova.require("com.salesforce.plugin.smartsync").syncDown(
                    {type:"soql", query:that.query}, 
                    store.cache.soupName, null, 
                    function(result) {
                        that.syncId = result.syncId;
                    }
                );
            });

            document.addEventListener('syncDown', this.syncEvent.bind(this));
        },
        syncEvent: function(e) {
            if (e.detail.syncId == this.syncId) this.fire(e.type.toLowerCase(), {status: e.detail.status});
        }
    }));

})(window.SFDC);