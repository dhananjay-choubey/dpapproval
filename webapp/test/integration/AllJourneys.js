/* global QUnit*/

sap.ui.define([
	"sap/ui/test/Opa5",
	"com/rmz/dpapproval/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"com/rmz/dpapproval/test/integration/pages/App",
	"com/rmz/dpapproval/test/integration/navigationJourney"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "com.rmz.dpapproval.view.",
		autoWait: true
	});
});