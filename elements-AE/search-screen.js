Polymer({
  is: 'search-screen', 
  properties: {
    sobject: String,
    searchfields: String,
    fieldstofetch: String,
    resultHeight: Number,
    cachePromise: Object,
    cachemode: {
      type: String,
      value: Force.CACHE_MODE.CACHE_ONLY
    }
  },
  behaviors: [SFDC.RoutingBehavior],
  ready: function() {
    this.async(this.initialize);
    // Add online/offline event listeners to toggle the sync icon
    var _boundNetworkStatus = this.setNetworkStatus.bind(this);
    document.addEventListener("online", _boundNetworkStatus, false);
    document.addEventListener("offline", _boundNetworkStatus, false);
  },

  setNetworkStatus: function() {
    var toastMsg = 'You are now ';
    if (SFDC.isOnline()) {
      toastMsg += 'online.';
      this.$.sync_icon.setAttribute('icon', "notification:sync");
    } else {
      toastMsg += 'offline.';
      this.$.sync_icon.setAttribute('icon', "cloud-off");
    }
    this.$.status_toast.text = toastMsg;
    this.$.status_toast.show();
  },

  initialize: function() {
    console.log('calling initialize');
    this.setNetworkStatus();
    this.fetchData();
    var scrollHeader = this.$.scrollHeader;
    var input = this.$.search.$.input.$.input;
    scrollHeader.addEventListener('transitionend', function(e) {
      // Only act when transition happened on scrollheader element, 
      // but not by a child element event bubbling up.
      if (e.target == scrollHeader) {
        scrollHeader.classList.remove('animating');
        if (scrollHeader.classList.contains('search')) {
              scrollHeader.style.transform = 
                  scrollHeader.style.webkitTransform = 'translate3d(0, 0, 0)';
              scrollHeader.style.top = '-64px';
              input.style.opacity = 1;
              if (navigator.userAgent.search(/iPhone/) > 0) input.style.visibility = '';
              input.focus(); // required by chrome
        } else scrollHeader.style.top = '0px';
      }
    });
    this._viewportHeight = window.innerHeight * 2; // Adding safety margin
    this.$.uilist.addEventListener('scroll', this.scrollHandler.bind(this), false);
  },

  scrollHandler: function(e, detail) {
    var scrollTop = e.detail ? e.detail.target.scrollTop : e.target.scrollTop;
    var totalHeight = this.resultHeight * this.$.list.collection.size();
    if (!this._fetching && scrollTop > (totalHeight - this._viewportHeight)) {
      this._fetching = true;
      this.async(function() { 
        var that = this;
        var promise = this.$.list.fetchMore();
        // Promise may be null if no more records are to be fetched
        if (promise) promise.always(function() { that._fetching = false; }); 
        else that._fetching = false;
      });
    }
  },

  showMenu: function() {
    // Dummy method. Parent page will override this.
  },

  searchFocused: function() {
    var input = this.$.search.$.input.$.input;
    input.focus();
    if (!this._searchFocued) {
      this._searchFocued = true;
      input.style.opacity = 0;
      // Need to add this for iOS old webiew as the cursor acts weird otherwise
      if (navigator.userAgent.search(/iPhone/) > 0) input.style.visibility = 'hidden';
      this.$.scrollHeader.classList.add('search', 'animating');
    }
  },
  cancelSearch: function() {
    var scrollHeader = this.$.scrollHeader;
    this.$.search.criteria = 
      this.$.search.$.input.$.input.value = ''; //Manually mark input value, seems like a bug on android chrome.
    scrollHeader.style.transform = 
      scrollHeader.style.webkitTransform = '';
    scrollHeader.style.top = '0px';
    this.$.search.$.input.$.input.blur();
    this.async(function() { 
         scrollHeader.classList.add('animating');
         scrollHeader.classList.remove('search');
         this._searchFocued = false;
    });
  },

  fireSyncUp: function() {
    if (SFDC.isOnline()) {
      this.$.sync_icon.classList.add('sync-animation');
      this.fire('syncup');
    }
  },

  syncComplete: function(result) {
    this.$.sync_icon.classList.remove('sync-animation');
    if (result && result.failures > 0) 
      this.$.status_toast.text = 'Sync completed with ' + result.failures + ' failures.';
    else this.$.status_toast.text = 'Sync completed successfully.';
    this.$.status_toast.show();
  },

  handleSyncResponse: function(e) {
    if (e.detail.status == 'DONE') {
      this.$.status_toast.text = 'Finished syncing ' + e.detail.totalSize + ' records.';
      this.$.status_toast.show();
    }
    this.fetchData();
  },

  fetchData: function() {
    console.log('calling fetchData');
    var onFetch = function() {
      if (this.$.list.collection.size() > 0) {
        this.$.loading.style.display = "none";
        this.$.list.autosync = true;
        this.models = this.searchresults.models;
      } else this.setupSyncQuery();
      this.$.list.removeEventListener('sync', onFetch);
    }.bind(this);

    if (!this.$.list.autosync) {
      this.$.list.addEventListener('sync', onFetch);
      this.async(function() { this.$.list.fetch(); });
    }
  },

  setupSyncQuery: function() {
    var that = this;

    var searchFields = this.searchfields.trim().split(/\s+/);
    var fieldsToFetch = this.fieldstofetch ? this.fieldstofetch.trim().split(/\s+/) : [];
    fieldsToFetch = _.union(searchFields, fieldsToFetch);

    // Filter out any in-accessible fields due to FLS on user profile
    var sobjectType = SFDC.getSObjectType(this.sobject);
    sobjectType.describe()
    .then(function(describeResult) {
      if (describeResult) {
        fieldsToFetch = _.intersection(fieldsToFetch, _.pluck(describeResult.fields, 'name'));
      }
    }).then(function() {
      that.syncQuery = "SELECT Id, " + fieldsToFetch.join(',') + " FROM " + that.sobject + " LIMIT 4000";
    });
  },

  stopClick: function(e) {
    //e.preventDefault();
    if (e.currentTarget == this.$.uilist && this._searchFocued) {
      this.$.search.$.input.$.input.blur();
    }
  },

  attached: function() {
    //this.$.uilist.appendChild(this.querySelector('template'));
  },

  refresh: function() {
    this.$.list.fetch();
  },

  navigateToCreate: function() {
    window.location.hash = "#edit";
  }
});