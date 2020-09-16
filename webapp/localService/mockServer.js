sap.ui.define([
	"sap/ui/core/util/MockServer"
], function (MockServer) {
	"use strict";
	return {
		init: function () {
			// create
			var oMockServer = new MockServer({
				rootUri: "/sap/opu/odata/SAP/ZPROJ_DP_APPROVAL_SRV/"
			});
			// simulate
			var sPath = jQuery.sap.getModulePath("com.rmz.dpapproval.localService");
			oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");
			// start
			oMockServer.start();
		}
	};
});