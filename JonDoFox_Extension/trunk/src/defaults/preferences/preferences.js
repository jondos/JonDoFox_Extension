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
pref("extensions.jondofox.jondo.buildID_override", "20140315085348");
pref("extensions.jondofox.jondo.oscpu_override", "Linux i686");
pref("extensions.jondofox.jondo.platform_override", "Linux i686");
pref("extensions.jondofox.jondo.productsub_override", "20100101");
pref("extensions.jondofox.jondo.useragent_override", "Mozilla/5.0 (X11; Linux i686; rv:24.0) Gecko/20100101 Firefox/24.0");
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
pref("extensions.jondofox.tor.useragent_override", "Mozilla/5.0 (Windows NT 6.1; rv:24.0) Gecko/20100101 Firefox/24.0");
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
pref("extensions.jondofox.windows.buildID_override", "20140314220517");
pref("extensions.jondofox.windows.oscpu_override", "Windows NT 6.1");
pref("extensions.jondofox.windows.platform_override", "Win32");
pref("extensions.jondofox.windows.productsub_override", "20100101");
pref("extensions.jondofox.windows.useragent_override", "Mozilla/5.0 (Windows NT 6.1; rv:28.0) Gecko/20100101 Firefox/28.0");
pref("extensions.jondofox.windows.useragent_vendor", "");
pref("extensions.jondofox.windows.useragent_vendorSub", "");
pref("extensions.jondofox.windows.accept_languages", "en-us,en");
pref("extensions.jondofox.windows.accept_default", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
pref("extensions.jondofox.windows.image_http_accept", "image/png,image/*;q=0.8,*/*;q=0.5");
pref("extensions.jondofox.windows.http.accept_encoding", "gzip, deflate");
pref("extensions.jondofox.windows.default_charset", "ISO-8859-1");

// SafeBrowsing provider JonDo
pref("extensions.jondofox.safebrowsing.provider.0.gethashURL",
    "http://safebrowsing.clients.google.com/safebrowsing/gethash?client=navclient-auto-ffox&appver=24.0&pver=2.2");
pref("extensions.jondofox.safebrowsing.provider.0.keyURL",
    "https://sb-ssl.google.com/safebrowsing/newkey?client=navclient-auto-ffox&appver=24.0&pver=2.2");
pref("extensions.jondofox.safebrowsing.provider.0.lookupURL",
    "http://safebrowsing.clients.google.com/safebrowsing/lookup?sourceid=firefox-antiphish&features=TrustRank&client=navclient-auto-ffox&appver=24.0&");
pref("extensions.jondofox.safebrowsing.provider.0.reportErrorURL",
    "http://en-US.phish-error.mozilla.com/?hl=en-US");
pref("extensions.jondofox.safebrowsing.provider.0.reportGenericURL",
    "http://en-US.phish-generic.mozilla.com/?hl=en-US");
pref("extensions.jondofox.safebrowsing.provider.0.reportMalwareErrorURL",
    "http://en-US.malware-error.mozilla.com/?hl=en-US");
pref("extensions.jondofox.safebrowsing.provider.0.reportMalwareURL",
    "http://en-US.malware-report.mozilla.com/?hl=en-US");
pref("extensions.jondofox.safebrowsing.provider.0.reportPhishURL",
    "http://en-US.phish-report.mozilla.com/?hl=en-US");
pref("extensions.jondofox.safebrowsing.provider.0.reportURL",
    "http://safebrowsing.clients.google.com/safebrowsing/report?");
pref("extensions.jondofox.safebrowsing.provider.0.updateURL",
    "http://safebrowsing.clients.google.com/safebrowsing/downloads?client=navclient-auto-ffox&appver=24.0&pver=2.2");

pref("extensions.jondofox.safebrowsing.warning.infoURL", "http://www.mozilla.com/en-US/firefox/phishing-protection/");

pref("extensions.jondofox.safebrowsing.malware.reportURL", "http://safebrowsing.clients.google.com/safebrowsing/diagnostic?client=%NAME%&hl=en-US&site=");


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
pref("extensions.jondofox.dom_storage_enabled", false);
pref("extensions.jondofox.geo_enabled", false);
pref("extensions.jondofox.network_prefetch-next", false);
pref("extensions.jondofox.network_dns_disablePrefetch", true);
pref("extensions.jondofox.cookieBehavior", 2);
pref("extensions.jondofox.socks_remote_dns", true);
pref("extensions.jondofox.sanitize_onShutdown", true);
// In order to be able to use NoScript's STS feature...
pref("extensions.jondofox.clearOnShutdown_history", false);
pref("extensions.jondofox.clearOnShutdown_offlineApps", true);
// Only valid for FF4+
pref("extensions.jondofox.indexedDB.enabled", false);
// Only valid for FF3
pref("extensions.jondofox.history_expire_days", 0);

pref("extensions.jondofox.search_suggest_enabled", false);
pref("extensions.jondofox.delete_searchbar", true);
// Only valid for FF4
// No pinging of Mozilla once a day for Metadata updates or whatever
// See: http://blog.mozilla.com/addons/2011/02/10/add-on-metadata-start-up-time
pref("extensions.jondofox.getAddons.cache.enabled", false);

// See: http://www.contextis.com/resources/blog/webgl/
pref("extensions.jondofox.webgl.disabled", true);

// No document fonts to avoid this fingerprint means
pref("extensions.jondofox.use_document_fonts", 0);

// we allow just two items in the session history due to fingerprinting issues
pref("extensions.jondofox.sessionhistory.max_entries", 2);

// Disabling TLS Session Resumption tracking (see:
// https://tools.ietf.org/html/rfc5077)
pref("extensions.jondofox.tls_session_tickets", false);

// Disabling all plugins in JonDonym-Mode
pref("extensions.jondofox.disableAllPluginsJonDoMode", true);

// The Navigation Timing API
pref("extensions.jondofox.navigationTiming.enabled", false);

// The Battery API
pref("extensions.jondofox.battery.enabled", false);

// Gamepad API
pref("extensions.jondofox.gamepad.enabled", false);

// SPDY
pref("extensions.jondofox.spdy.enabled", false);

// Connection sniffing via JS
pref("extensions.jondofox.dom.network.enabled", false);

// Clipboard Sniffing vai JS
pref("extensions.jondofox.event.clipboardevents.enabled", false);

// Thumbnails for the New Tab page
pref("extensions.jondofox.pagethumbnails.disabled", true);

// secure the download manager to avoid wrting to disk
pref("extensions.jondofox.download_manager_addToRecentDocs", false);

pref("extensions.jondofox.formfill.enable", false);

//SafeCache
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

//JonDoBrowser
pref("extensions.jondofox.advanced_menu", false);
pref("extensions.jondofox.update_jondonym", false);
pref("extensions.jondofox.jdb.version", "0.14");
