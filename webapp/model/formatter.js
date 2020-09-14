sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue: function (sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},

		/**
		 * Returns a configuration object for the {@link sap.ushell.ui.footerbar.AddBookMarkButton} "appData" property
		 * @public
		 * @param {string} sTitle the title for the "save as tile" dialog
		 * @returns {object} the configuration object
		 */
		shareTileData: function (sTitle) {
			return {
				title: sTitle
			};
		},
		getTextAreaVisibility: function (sAction) {
			if (sAction === "Approve") {
				return false;
			} else {
				return true;
			}
		},
		getSubmitButtonEnable: function (sAction) {
			if (sAction === "Approve") {
				return true;
			} else {
				return false;
			}
		}
	};

});