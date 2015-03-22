// General prefs
pref("extensions.jondofox.last_version", "");

// Debug pref
pref("extensions.jondofox.debug.enabled", false);
// Proxy state
pref("extensions.jondofox.proxy.state", "jondo");
pref("extensions.jondofox.alwaysUseJonDo", false);

pref("extensions.jondofox.firstStart", true);

// Helping the EFF and its observatory
pref("extensions.jondofox.observatory.cache_submitted", true);
pref("extensions.jondofox.observatory.proxy", 0);

// Set the 'Referer' header according our smart spoof functionality
pref("extensions.jondofox.set_referrer", true);

// Show different warnings in the beginning
pref("extensions.jondofox.update_warning", true);
pref("extensions.jondofox.preferences_warning", true);
pref("extensions.jondofox.proxy_warning", true);

// No proxy list has to be empty
pref("extensions.jondofox.network_no_proxies_on", "");

// Custom proxy
pref("extensions.jondofox.custom.label", "");
pref("extensions.jondofox.custom.user_agent", "normal");
pref("extensions.jondofox.custom.proxyKeepAlive", true);
pref("extensions.jondofox.custom.http_host", "");
pref("extensions.jondofox.custom.http_port", 0);
pref("extensions.jondofox.custom.ssl_host", "");
pref("extensions.jondofox.custom.ssl_port", 0);
pref("extensions.jondofox.custom.ftp_host", "");
pref("extensions.jondofox.custom.ftp_port", 0);
pref("extensions.jondofox.custom.gopher_host", "");
pref("extensions.jondofox.custom.gopher_port", 0);
pref("extensions.jondofox.custom.socks_host", "");
pref("extensions.jondofox.custom.socks_port", 0);
pref("extensions.jondofox.custom.socks_version", 5);
pref("extensions.jondofox.custom.share_proxy_settings", false);
pref("extensions.jondofox.custom.empty_proxy", true);

// Custom proxy backups
pref("extensions.jondofox.custom.backup.ssl_host", "");
pref("extensions.jondofox.custom.backup.ssl_port", 0);
pref("extensions.jondofox.custom.backup.ftp_host", "");
pref("extensions.jondofox.custom.backup.ftp_port", 0);
pref("extensions.jondofox.custom.backup.gopher_host", "");
pref("extensions.jondofox.custom.backup.gopher_port", 0);
pref("extensions.jondofox.custom.backup.socks_host", "");
pref("extensions.jondofox.custom.backup.socks_port", 0);
pref("extensions.jondofox.custom.backup.socks_version", 5);

// JonDo proxy settings
pref("extensions.jondofox.jondo.host", "127.0.0.1");
pref("extensions.jondofox.jondo.port", 4001);

// Tor proxy settings
pref("extensions.jondofox.tor.http_host", "");
pref("extensions.jondofox.tor.http_port", 0);
pref("extensions.jondofox.tor.ssl_host", "");
pref("extensions.jondofox.tor.ssl_port", 0);
pref("extensions.jondofox.tor.socks_host", "127.0.0.1");
pref("extensions.jondofox.tor.socks_port", 9050);

// Useragent settings JonDo
pref("extensions.jondofox.jondo.appname_override", "Netscape");
pref("extensions.jondofox.jondo.appversion_override", "5.0 (X11)");
pref("extensions.jondofox.jondo.buildID_override", "20150217104802");
pref("extensions.jondofox.jondo.oscpu_override", "Linux i686");
pref("extensions.jondofox.jondo.platform_override", "Linux i686");
pref("extensions.jondofox.jondo.productsub_override", "20100101");
pref("extensions.jondofox.jondo.useragent_override", "Mozilla/5.0 (X11; Linux i686; rv:31.0) Gecko/20100101 Firefox/31.0");
pref("extensions.jondofox.jondo.useragent_vendor", "");
pref("extensions.jondofox.jondo.useragent_vendorSub", "");
pref("extensions.jondofox.jondo.accept_languages", "en-US,en");
pref("extensions.jondofox.jondo.accept_default", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
pref("extensions.jondofox.jondo.image_http_accept", "image/png,image/*;q=0.8,*/*;q=0.5");
pref("extensions.jondofox.jondo.http.accept_encoding", "gzip, deflate");
pref("extensions.jondofox.jondo.default_charset", "ISO-8859-1");

// Useragent settings Tor
pref("extensions.jondofox.tor.appname_override","Netscape");
pref("extensions.jondofox.tor.appversion_override","5.0 (Windows)");
pref("extensions.jondofox.tor.buildID_override","");
pref("extensions.jondofox.tor.oscpu_override", "Windows NT 6.1");
pref("extensions.jondofox.tor.platform_override","Win32");
pref("extensions.jondofox.tor.productsub_override","20100101");
pref("extensions.jondofox.tor.useragent_override", "Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.0");
pref("extensions.jondofox.tor.useragent_vendor", "");
pref("extensions.jondofox.tor.useragent_vendorSub","");
pref("extensions.jondofox.tor.accept_languages", "en-us,en");
pref("extensions.jondofox.tor.accept_default", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
pref("extensions.jondofox.tor.image_http_accept", "image/png,image/*;q=0.8,*/*;q=0.5");
pref("extensions.jondofox.tor.http.accept_encoding", "gzip, deflate");
pref("extensions.jondofox.tor.default_charset", "ISO-8859-1");

// Useragent settings FF Windows
pref("extensions.jondofox.windows.appname_override", "Netscape");
pref("extensions.jondofox.windows.appversion_override", "5.0 (Windows)");
pref("extensions.jondofox.windows.buildID_override", "20150222232811");
pref("extensions.jondofox.windows.oscpu_override", "Windows NT 6.1");
pref("extensions.jondofox.windows.platform_override", "Win32");
pref("extensions.jondofox.windows.productsub_override", "20100101");
pref("extensions.jondofox.windows.useragent_override", "Mozilla/5.0 (Windows NT 6.1; rv:36.0) Gecko/20100101 Firefox/36.0");
pref("extensions.jondofox.windows.useragent_vendor", "");
pref("extensions.jondofox.windows.useragent_vendorSub", "");
pref("extensions.jondofox.windows.accept_languages", "en-US,en");
pref("extensions.jondofox.windows.accept_default", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
pref("extensions.jondofox.windows.image_http_accept", "image/png,image/*;q=0.8,*/*;q=0.5");
pref("extensions.jondofox.windows.http.accept_encoding", "gzip, deflate");
pref("extensions.jondofox.windows.default_charset", "ISO-8859-1");

// Useragent settings FF Windows ESR
pref("extensions.jondofox.windows_esr.buildID_override", "20140714155506");
pref("extensions.jondofox.windows_esr.useragent_override", "Mozilla/5.0 (Windows NT 6.1; rv:24.0) Gecko/20100101 Firefox/24.0");


// SafeBrowsing provider JonDo
pref("extensions.jondofox.safebrowsing_enabled", false);


// Feed prefs
pref("extensions.jondofox.feeds_handler_default", "bookmarks");
pref("extensions.jondofox.audioFeeds_handler_default", "bookmarks");
pref("extensions.jondofox.videoFeeds_handler_default", "bookmarks");

// External app warn prefs
pref("extensions.jondofox.network-protocol-handler.warn_external_news", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_snews", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_file", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_nntp", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_mailto", true);
pref("extensions.jondofox.network-protocol-handler.warn_external_default", true);

// Certificate prefs
pref("extensions.jondofox.security.default_personal_cert", "Ask Every Time");
pref("extensions.jondofox.security.remember_cert_checkbox_default_setting", false);

// Miscellaneous
// Just in case someone has enabled it...
pref("extensions.jondofox.browser_send_pings", false);
// Do not let them know the full plugin path...
pref("extensions.jondofox.plugin.expose_full_path", false);
// Do not track users via their site specific zoom [sic!]
pref("extensions.jondofox.browser.zoom.siteSpecific", false);

pref("extensions.jondofox.source_editor_external", false);
pref("extensions.jondofox.dom_storage_enabled", true);
pref("extensions.jondofox.geo_enabled", false);
pref("extensions.jondofox.network_prefetch-next", false);
pref("extensions.jondofox.network_dns_disablePrefetch", true);
pref("extensions.jondofox.cookieBehavior", 2);
pref("extensions.jondofox.socks_remote_dns", true);
pref("extensions.jondofox.sanitize_onShutdown", true);
pref("extensions.jondofox.clearOnShutdown_history", true);
pref("extensions.jondofox.clearOnShutdown_offlineApps", true);
pref("extensions.jondofox.indexedDB.enabled", false);
// only for FF 35 because of a bug
pref("extensions.jondofox.indexedDB.enabled35", true);
pref("extensions.jondofox.history_expire_days", 0);

pref("extensions.jondofox.search_suggest_enabled", false);
pref("extensions.jondofox.delete_searchbar", true);

pref("extensions.jondofox.getAddons.cache.enabled", false);

// See: http://www.contextis.com/resources/blog/webgl/
pref("extensions.jondofox.webgl.disabled", true);

pref("extensions.jondofox.iframes_disabled", true);

// for Firefox 34+
pref("extensions.jondofox.loop_enabled", false);

// for Forefox 36+
pref("extensions.jondofox.disable_session_identifiers", true);

// No document fonts to avoid this fingerprint means
pref("extensions.jondofox.use_document_fonts", 0);

// we allow just two items in the session history due to fingerprinting issues
pref("extensions.jondofox.sessionhistory.max_entries", 2);
pref("extensions.jondofox.places_history_enabled", false);


// Do not restore sessions
pref("extensions.jondofox.sessionstore_privacy_level", 2);

// Disabling all plugins in JonDonym-Mode
pref("extensions.jondofox.disableAllPluginsJonDoMode", true);
pref("extensions.jondofox.plugins_enumerable_names", "");

// The Navigation Timing API
pref("extensions.jondofox.navigationTiming.enabled", false);

// disable video Stats
pref("extensions.jondofox.video_stats_enabled", false);

// The Battery API
pref("extensions.jondofox.battery.enabled", false);

// Gamepad API
pref("extensions.jondofox.gamepad.enabled", false);

// Sensors API
pref("extensions.jondofox.sensors.enabled", false);

//  Snippet URL
pref("extensions.jondofox.snippet_url", "");

// disable insecure SSL
pref("extensions.jondofox.disable_insecure_ssl_cipher", true);
pref("extensions.jondofox.disable_insecure_ssl_nego", false);
pref("extensions.jondofox.disable_insecure_ssl_mixed", false);

// Connection sniffing via JS
pref("extensions.jondofox.dom.network.enabled", false);

// Javascript stuff
pref("extensions.jondofox.event.clipboardevents.enabled", false);
pref("extensions.jondofox.javascript.options.ion.content", false);
pref("extensions.jondofox.javascript.options.baselinejit.content", false);
pref("extensions.jondofox.javascript.options.asmjs", false);

pref("extensions.jondofox.gfx.direct2d.disabled", true);
pref("extensions.jondofox.layers.acceleration.disabled", true);

// Thumbnails for the New Tab page
pref("extensions.jondofox.pagethumbnails.disabled", true);
pref("extensions.jondofox.newtabpage.enabled", false);
pref("extensions.jondofox.newtabpage.url", "about:blank");

// secure the download manager to avoid writing to disk
pref("extensions.jondofox.download_manager_addToRecentDocs", false);

pref("extensions.jondofox.formfill.enable", false);

// SafeCache
pref("extensions.jondofox.stanford-safecache_enabled", true);
pref("extensions.jondofox.browser_cache_memory_capacity", 65536);

//Certificate Patrol
pref("extensions.jondofox.certpatrol_enabled", false);
pref("extensions.jondofox.certpatrol_showNewCert", false);
pref("extensions.jondofox.certpatrol_showChangedCert", false);

pref("extensions.jondofox.notificationTimeout", 10);

//AdBlocking
pref("extensions.jondofox.adblock_enabled", true);

//Bloody Vkings
pref("extensions.jondofox.temp.email.activated", true);
pref("extensions.jondofox.temp.email.selected", "10minutemail.com");

//NoScript
pref("extensions.jondofox.noscript_showDomain", false);
pref("extensions.jondofox.noscript_dnt_enabled", false);

// Mozilla shall not be able to deactivate one of our extensions
pref("extensions.jondofox.blocklist.enabled", false);

// No WebRTC UDP sockets for JonDoFox user
pref("extensions.jondofox.peerconnection.enabled", false);

// disable experiments
pref("extensions.jondofox.experiments_enabled", false);

//JonDoBrowser
pref("extensions.jondofox.advanced_menu", false);
pref("extensions.jondofox.update_jondonym", false);
pref("extensions.jondofox.jdb.version", "0.17");

