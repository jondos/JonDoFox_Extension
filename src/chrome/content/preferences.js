var JDF_preferencesService = null;

// Delete a preference
function JDF_deletePreference(preference) {
  // If the preference is set
  if (preference) {
    // If a user preference is set
    if (JDF_isPreferenceSet(preference)) {
      JDF_getPreferencesService().clearUserPref(preference);
    }
  }
}

// Delete a preference branch
function JDF_deletePreferenceBranch(branch) {
  // If the branch is set
  if (branch) {
    JDF_getPreferencesService().deleteBranch(branch);
  }
}

// Get a boolean preference, return false if the pref is not set
function JDF_getBooleanPreference(preference, userPreference) {
  // If the preference is set
  if (preference) {
    // If not a user preference or a user preference is set
    if (!userPreference || JDF_isPreferenceSet(preference)) {
      try {
        return JDF_getPreferencesService().getBoolPref(preference);
      } catch(exception) {
        // Do nothing
      }
    }
  }
  return false;
}

// Get an integer preference, return 0 if the pref is not set
function JDF_getIntegerPreference(preference, userPreference) {
  // If the preference is set
  if(preference) {
    // If not a user preference or a user preference is set
    if(!userPreference || JDF_isPreferenceSet(preference)) {
      try {
        return JDF_getPreferencesService().getIntPref(preference);
      } catch(exception) {
        // Do nothing
      }
    }
  }
  return 0;
}

// Get the preferences service
function JDF_getPreferencesService() {
  // Falls er nicht schon exisitiert...
  if (!JDF_preferencesService) {
    JDF_preferencesService = Components.classes["@mozilla.org/preferences-service;1"].
       getService(Components.interfaces.nsIPrefService).getBranch("");
  }
  return JDF_preferencesService;
}

// Get a string preference, return null if the preference is not set
function JDF_getStringPreference(preference, userPreference) {
  // If the preference is set
  if (preference) {
    // If not a user preference or a user preference is set
    if (!userPreference || JDF_isPreferenceSet(preference)) {
      try {
        return JDF_getPreferencesService().getComplexValue(preference, 
           Components.interfaces.nsISupportsString).data.trim();
      } catch(exception) {
        // Do nothing
      }
    }
  }
  return null;
}

// Is a preference set
function JDF_isPreferenceSet(preference) {
  if(preference) {
    return JDF_getPreferencesService().prefHasUserValue(preference);
  }
  return false;
}

// Set a boolean preference
function JDF_setBooleanPreference(preference, value) {
  // If the preference is set
  if(preference) {
    JDF_getPreferencesService().setBoolPref(preference, value);
  }
}

// Set a boolean preference if it is not already set
function JDF_setBooleanPreferenceIfNotSet(preference, value) {
  // If the preference is not set
  if (!JDF_isPreferenceSet(preference)) {
    JDF_getPreferencesService().setBoolPref(preference, value);
  }
}

// Set an integer preference
function JDF_setIntegerPreference(preference, value) {
  // If the preference is set
  if(preference) {
    JDF_getPreferencesService().setIntPref(preference, value);
  }
}

// Set an integer preference if it is not already set
function JDF_setIntegerPreferenceIfNotSet(preference, value) {
  // If the preference is not set
  if (!JDF_isPreferenceSet(preference)) {
    JDF_setIntegerPreference(preference, value);
  }
}

// Set a string preference
function JDF_setStringPreference(preference, value) {
  if(preference) {   
    var supportsStringInterface = Components.interfaces.nsISupportsString;
    var string                  = Components.classes["@mozilla.org/supports-string;1"].
       createInstance(supportsStringInterface);
    string.data = value;		
    // Set value
    JDF_getPreferencesService().setComplexValue(preference, supportsStringInterface, string);
  }
}

// Set a string preference if it is not already set
function JDF_setStringPreferenceIfNotSet(preference, value) {
  // If the preference is not set
  if (!JDF_isPreferenceSet(preference)) {
    JDF_setStringPreference(preference, value);
  }
}
