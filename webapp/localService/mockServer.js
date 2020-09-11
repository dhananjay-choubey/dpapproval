sap.ui.define([
	"sap/ui/core/util/MockServer"
], function (MockServer) {
	"use strict";
	return {
		init: function () {
			// create
			var oMockServer = new MockServer({
				rootUri: "/here/goes/your/serviceUrl/"
			});
			// simulate
			var sPath = jQuery.sap.getModulePath("com.rmz.dpapproval.localService");
			oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");
			// start
			oMockServer.start();
		}
	};
});