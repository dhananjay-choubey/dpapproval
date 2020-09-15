/*global location */
sap.ui.define([
	"com/rmz/dpapproval/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/rmz/dpapproval/model/formatter",
	"sap/ui/Device",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/m/TextArea",
	"sap/m/VBox",
	"sap/m/Button",
	"sap/m/ButtonType",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, formatter, Device, Dialog, Text, TextArea, VBox, Button, ButtonType, MessageToast) {
	"use strict";

	return BaseController.extend("com.rmz.dpapproval.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			//this.getOwnerComponent().oWhenMetadataIsLoaded.then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getOwnerComponent().oWhenMetadataIsLoaded.then(function () {
				var sObjectPath = this.getModel().createKey("DPHeaderDataSet", {
					DPNumber: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
			this._setFragmentVisibilities();
		},
		_setFragmentVisibilities: function (oEvent) {
			if (Device.system.phone) {
				if (!this._developmentContent) {
					this._developmentContent = sap.ui.xmlfragment("com.rmz.dpapproval.fragments.DevelopmentMobile", this);
				}
				if (!this._capitalContent) {
					this._capitalContent = sap.ui.xmlfragment("com.rmz.dpapproval.fragments.CapitalMobile", this);
				}
				if (!this._revenueContent) {
					this._revenueContent = sap.ui.xmlfragment("com.rmz.dpapproval.fragments.RevenueMobile", this);
				}
			} else {
				if (!this._developmentContent) {
					this._developmentContent = sap.ui.xmlfragment("com.rmz.dpapproval.fragments.DevelopmentDesktop", this);
				}
				if (!this._capitalContent) {
					this._capitalContent = sap.ui.xmlfragment("com.rmz.dpapproval.fragments.CapitalDesktop", this);
				}
				if (!this._revenueContent) {
					this._revenueContent = sap.ui.xmlfragment("com.rmz.dpapproval.fragments.RevenueDesktop", this);
				}
			}
			//Set content to icontabbar
			this.getView().byId("devITFId").addContent(this._developmentContent);
			this.getView().byId("capITFId").addContent(this._capitalContent);
			this.getView().byId("revITFId").addContent(this._revenueContent);

		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath();

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},
		_onApproveButtonPress: function (oEvent) {
			this._executeAction("Approve");
		},
		_onRejectButtonPress: function (oEvent) {
			this._executeAction("Reject");
		},
		_prepareData: function (sData, sComment, sAction) {
			return {
				DPNumber: sData.DPNumber,
				WorkitemID: sData.WorkitemID,
				Version: sData.Version,
				Comment: sComment,
				Action: sAction
			};
		},
		_executeAction: function (sAction) {
			var that = this;
			var sBindingElement = this.getView().getElementBinding();
			var sModel = sBindingElement.getModel();
			var sData = sModel.getProperty(sBindingElement.getPath());
			var sMessage = this.getResourceBundle().getText("approvalRejMsg", [sAction, sData.DPNumber, sData.CreatedByID]);

			var dialog = new Dialog({
				title: sAction,
				type: "Message",
				content: [
					new VBox({
						items: [
							new Text({
								width: "100%",
								text: sMessage,
								wrapping: true
							}),
							new TextArea('submitDialogTextarea', {
								placeholder: that.getResourceBundle().getText("mandtComment"),
								rows: 4,
								width: '100%',
								visible: formatter.getTextAreaVisibility(sAction),
								liveChange: function (oEvent) {
									var sText = oEvent.getParameter('value').trim();
									var parent = oEvent.getSource().getParent().getParent();
									parent.getBeginButton().setEnabled(sText.length > 0);
								}
							})
						]
					})

				],
				beginButton: new Button({
					type: ButtonType.Emphasized,
					text: 'Submit',
					enabled: formatter.getSubmitButtonEnable(sAction),
					press: function () {
						var sText = sap.ui.getCore().byId('submitDialogTextarea').getValue();
						var sFinalData = that._prepareData(sData, sText, sAction);
						that._callService(sFinalData, sModel, sBindingElement.getPath());
						dialog.close();
					}
				}),
				endButton: new Button({
					text: 'Cancel',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		_callService: function (sData, oModel, sPath) {
			oModel.update(sPath, sData, {
				success: function (oData, oResponse) {
					//MessageToast.show(oData.Response);
					MessageToast.show("Approved/Rejected");
					this.getRouter().navTo("master", true);
				}.bind(this)
			});
		}

	});

});