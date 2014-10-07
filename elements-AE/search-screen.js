Polymer('search-screen', {
  cachemode: Force.CACHE_MODE.CACHE_ONLY,
  ready: function() {
    this.super();
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
        this.$.list.fetchMore().always(function() { that._fetching = false; }); 
      });
    }
  },

  showMenu: function() {
    // Dummy method. Parent page will override this.
  },

  searchFocused: function() {
    var input = this.$.search.$.input.$.input;
    if (!this._searchFocued) {
      this._searchFocued = true;
      input.focus();
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

  syncComplete: function() {
    this.$.sync_icon.classList.remove('sync-animation');
    this.$.status_toast.text = 'Sync completed successfully.';
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
      } else this.setupSyncQuery();
      this.$.list.removeEventListener('sync', onFetch);
    }.bind(this);

    if (!this.$.list.autosync) {
      this.$.list.addEventListener('sync', onFetch);
      this.async(function() { this.$.list.fetch(); });
    }
  },

  setupSyncQuery: function() {
    var searchFields = this.searchfields.trim().split(/\s+/);
    var fieldsToFetch = this.fieldstofetch ? this.fieldstofetch.trim().split(/\s+/) : [];
    fieldsToFetch = _.union(searchFields, fieldsToFetch);

    this.syncQuery = "SELECT Id, " + fieldsToFetch.join(',') + " FROM " + this.sobject + " LIMIT 4000";
  },

  stopClick: function(e) {
    e.preventDefault();
  },

  attached: function() {
    this.$.uilist.appendChild(this.querySelector('template'));
  },

  refresh: function() {
    this.$.list.fetch();
  },

  navigateToCreate: function() {
    window.location.hash = "#edit";
  }
});