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
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, formatter, Device, Dialog, Text, TextArea, VBox, Button, ButtonType, MessageToast, MessageBox) {
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
				parameters: {
					expand: "GrowthDevelopment,GrowthCapital,GrowthRevenue,GrowthApproverComments"
				},
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
			this._executeActionApprove("Approve");
		},
		_onRejectButtonPress: function (oEvent) {
			this._executeActionReject("Reject");
		},
		_prepareDataApproval: function (sData, sComment, sAction) {
			if (sAction === "Approve") {
				sAction = "A";
			} else {
				sAction = "R";
			}
			return {
				DPNumber: sData.DPNumber,
				WorkitemID: sData.WorkitemID,
				Version: sData.Version,
				Comment: sComment,
				Action: sAction,
				Level: sData.Level
			};
		},
		_executeActionApprove: function (sAction) {
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
								placeholder: that.getResourceBundle().getText("optComment"),
								rows: 4,
								width: '100%',
								visible: true
									//								,
									//								liveChange: function (oEvent) {
									//									var sText = oEvent.getParameter('value').trim();
									//									var parent = oEvent.getSource().getParent().getParent();
									//									parent.getBeginButton().setEnabled(sText.length > 0);
									//								}
							})
						]
					})

				],
				beginButton: new Button({
					type: ButtonType.Emphasized,
					text: 'Submit',
					enabled: true,
					//enabled: formatter.getSubmitButtonEnable(sAction),
					press: function () {
						var sText = sap.ui.getCore().byId('submitDialogTextarea').getValue();
						var sFinalData = that._prepareDataApproval(sData, sText, sAction);
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
			var that = this;
			oModel.update(sPath, sData, {
				success: function (oData, oResponse) {
					//MessageToast.show(oData.Response);
					var sMsg;
					if (sData.Action === "A") {
						sMsg = sData.DPNumber + " has been approved."
					} else {
						sMsg = sData.DPNumber + " has been rejected."
					}
					sap.m.MessageBox.alert(sMsg, {
						title: "Message",
						onClose: function (oAction) {
							that.getRouter().navTo("master", true);
						},
						initialFocus: sap.m.MessageBox.Action.OK
					});
				}.bind(this)
			});
		},
		_executeActionReject: function (sAction) {

			var that = this;
			var sBindingElement = this.getView().getElementBinding();
			var sModel = sBindingElement.getModel();
			var sData = sModel.getProperty(sBindingElement.getPath());
			var sMessage = this.getResourceBundle().getText("approvalRejMsg", [sAction, sData.DPNumber, sData.CreatedByID]);

			var dialog = new Dialog({
				title: sAction,
				width: "40%",
				type: "Message",
				content: [
					new VBox({
						fitContainer: true,
						items: [
							new Text({
								width: "100%",
								text: sMessage,
								wrapping: true
							}),
							new sap.m.VBox({
								width: "100%",
								fitContainer: true,
								items: [
									new sap.m.RadioButton("rejectAllRB", {
										text: "Reject All",
										groupName: "GroupA",
										selected: true,
										select: function (oEvent) {
											if (oEvent.getParameter("selected")) {
												sap.ui.getCore().byId("submitDialogTextareaRejectAll").setVisible(true);
												sap.ui.getCore().byId("growthHBoxId").setVisible(false);
												sap.ui.getCore().byId("devHBoxId").setVisible(false);
												sap.ui.getCore().byId("capitalHBoxId").setVisible(false);
												sap.ui.getCore().byId("revenueHBoxId").setVisible(false);
											} else {
												sap.ui.getCore().byId("submitDialogTextareaRejectAll").setVisible(false);
												sap.ui.getCore().byId("growthHBoxId").setVisible(true);
												sap.ui.getCore().byId("devHBoxId").setVisible(true);
												sap.ui.getCore().byId("capitalHBoxId").setVisible(true);
												sap.ui.getCore().byId("revenueHBoxId").setVisible(true);
											}
										}
									}).addStyleClass("sapUiSmallMarginEnd"),
									new TextArea('submitDialogTextareaRejectAll', {
										placeholder: that.getResourceBundle().getText("mandtComment"),
										rows: 3,
										width: '100%',
										visible: true
									})

								]
							}),
							new sap.m.VBox({
								width: "100%",
								items: [
									new sap.m.RadioButton("rejectSpecificRB", {
										text: "Reject Specific Process",
										groupName: "GroupA",
										selected: false,
										select: function (oEvent) {
											if (oEvent.getParameter("selected")) {
												sap.ui.getCore().byId("submitDialogTextareaRejectAll").setVisible(false);
												sap.ui.getCore().byId("growthHBoxId").setVisible(true);
												sap.ui.getCore().byId("devHBoxId").setVisible(true);
												sap.ui.getCore().byId("capitalHBoxId").setVisible(true);
												sap.ui.getCore().byId("revenueHBoxId").setVisible(true);
											} else {
												sap.ui.getCore().byId("submitDialogTextareaRejectAll").setVisible(true);
												sap.ui.getCore().byId("growthHBoxId").setVisible(false);
												sap.ui.getCore().byId("devHBoxId").setVisible(false);
												sap.ui.getCore().byId("capitalHBoxId").setVisible(false);
												sap.ui.getCore().byId("revenueHBoxId").setVisible(false);
											}
										}
									})

								]
							}),
							new sap.m.VBox("growthHBoxId", {
								width: "100%",
								visible: false,
								items: [
									new sap.m.CheckBox("rejectGrowthCB", {
										text: "Growth",
										selected: false,
										select: function (oEvent) {
											if (oEvent.getParameter("selected")) {
												sap.ui.getCore().byId("submitDialogTextareaRejectGrowth").setVisible(true);
											} else {
												sap.ui.getCore().byId("submitDialogTextareaRejectGrowth").setVisible(false);
												sap.ui.getCore().byId("submitDialogTextareaRejectGrowth").setValue("");
											}
										}
									}).addStyleClass("sapUiSmallMarginEnd"),
									new TextArea('submitDialogTextareaRejectGrowth', {
										placeholder: that.getResourceBundle().getText("mandtComment"),
										rows: 3,
										width: '100%',
										visible: false
									})

								]
							}),
							new sap.m.VBox("devHBoxId", {
								width: "100%",
								visible: false,
								items: [
									new sap.m.CheckBox("rejectDevCB", {
										text: "Development",
										selected: false,
										select: function (oEvent) {
											if (oEvent.getParameter("selected")) {
												sap.ui.getCore().byId("submitDialogTextareaRejectDev").setVisible(true);
											} else {
												sap.ui.getCore().byId("submitDialogTextareaRejectDev").setVisible(false);
												sap.ui.getCore().byId("submitDialogTextareaRejectDev").setValue("");
											}
										}
									}).addStyleClass("sapUiSmallMarginEnd"),
									new TextArea('submitDialogTextareaRejectDev', {
										placeholder: that.getResourceBundle().getText("mandtComment"),
										rows: 3,
										width: '100%',
										visible: false
									})

								]
							}),
							new sap.m.VBox("capitalHBoxId", {
								width: "100%",
								visible: false,
								items: [
									new sap.m.CheckBox("rejectCapCB", {
										text: "Capital",
										selected: false,
										select: function (oEvent) {
											if (oEvent.getParameter("selected")) {
												sap.ui.getCore().byId("submitDialogTextareaRejectCap").setVisible(true);
											} else {
												sap.ui.getCore().byId("submitDialogTextareaRejectCap").setVisible(false);
												sap.ui.getCore().byId("submitDialogTextareaRejectCap").setValue("");
											}
										}
									}).addStyleClass("sapUiSmallMarginEnd"),
									new TextArea('submitDialogTextareaRejectCap', {
										placeholder: that.getResourceBundle().getText("mandtComment"),
										rows: 3,
										width: '100%',
										visible: false
									})

								]
							}),
							new sap.m.VBox("revenueHBoxId", {
								width: "100%",
								visible: false,
								items: [
									new sap.m.CheckBox("rejectRevCB", {
										text: "Revenue",
										selected: false,
										select: function (oEvent) {
											if (oEvent.getParameter("selected")) {
												sap.ui.getCore().byId("submitDialogTextareaRejectRev").setVisible(true);
											} else {
												sap.ui.getCore().byId("submitDialogTextareaRejectRev").setVisible(false);
												sap.ui.getCore().byId("submitDialogTextareaRejectRev").setValue("");
											}
										}
									}).addStyleClass("sapUiSmallMarginEnd"),
									new TextArea('submitDialogTextareaRejectRev', {
										placeholder: that.getResourceBundle().getText("mandtComment"),
										rows: 3,
										width: '100%',
										visible: false
									})

								]
							})
						]
					})

				],
				beginButton: new Button({
					type: ButtonType.Emphasized,
					text: 'Submit',
					enabled: true,
					//enabled: formatter.getSubmitButtonEnable(sAction),
					press: function () {
						//						var sText = sap.ui.getCore().byId('submitDialogTextarea').getValue();
						//						var sFinalData = that._prepareDataApproval(sData, sText, sAction);
						//						that._callService(sFinalData, sModel, sBindingElement.getPath());
						//						dialog.close();
						//Check which rejection type is selected
						var sAllComment = "",
							sGrowthComment = "",
							sDevComment = "",
							sCapComment = "",
							sRevComment = "";
						var sErrorFlag = false,
							sErrorMessage = "";
						if (sap.ui.getCore().byId("rejectAllRB").getSelected()) {
							if (sap.ui.getCore().byId("submitDialogTextareaRejectAll").getValue().trim() === "") {
								sErrorFlag = true;
								sErrorMessage = sErrorMessage + "Please provide the rejection comment. \n";
								//return;
							} else {
								sAllComment = sap.ui.getCore().byId("submitDialogTextareaRejectAll").getValue();
							}
						} else {

							// if no selection made
							if (!sap.ui.getCore().byId("rejectGrowthCB").getSelected() &&
								!sap.ui.getCore().byId("rejectDevCB").getSelected() &&
								!sap.ui.getCore().byId("rejectCapCB").getSelected() &&
								!sap.ui.getCore().byId("rejectRevCB").getSelected()) {
								sErrorFlag = true;
								sErrorMessage = sErrorMessage + "Please select atleast one checkbox to reject a process. \n";
							}
							// this is the case of specific rejections
							//Check the checkbox selections for growth
							if (sap.ui.getCore().byId("rejectGrowthCB").getSelected()) {
								if (sap.ui.getCore().byId("submitDialogTextareaRejectGrowth").getValue().trim() === "") {
									sErrorFlag = true;
									sErrorMessage = sErrorMessage + "Please provide the rejection comment for growth. \n";
									//return;
								} else {
									sGrowthComment = sap.ui.getCore().byId("submitDialogTextareaRejectGrowth").getValue();
								}
							}
							//check the checkbox for development rejections
							if (sap.ui.getCore().byId("rejectDevCB").getSelected()) {
								if (sap.ui.getCore().byId("submitDialogTextareaRejectDev").getValue().trim() === "") {
									sErrorFlag = true;
									sErrorMessage = sErrorMessage + "Please provide the rejection comment for development. \n";
									//return;
								} else {
									sDevComment = sap.ui.getCore().byId("submitDialogTextareaRejectDev").getValue();
								}
							}
							//check the checkbox for capital rejections
							if (sap.ui.getCore().byId("rejectCapCB").getSelected()) {
								if (sap.ui.getCore().byId("submitDialogTextareaRejectCap").getValue().trim() === "") {
									sErrorFlag = true;
									sErrorMessage = sErrorMessage + "Please provide the rejection comment for capital. \n";
									//return;
								} else {
									sCapComment = sap.ui.getCore().byId("submitDialogTextareaRejectCap").getValue();
								}
							}
							//check the checkbox for revenue rejections
							if (sap.ui.getCore().byId("rejectRevCB").getSelected()) {
								if (sap.ui.getCore().byId("submitDialogTextareaRejectRev").getValue().trim() === "") {
									sErrorFlag = true;
									sErrorMessage = sErrorMessage + "Please provide the rejection comment for revenue. \n";
									//return;
								} else {
									sRevComment = sap.ui.getCore().byId("submitDialogTextareaRejectRev").getValue();
								}
							}
						}
						// check for error flag
						if (sErrorFlag) {
							sap.m.MessageToast.show(sErrorMessage);
							sErrorFlag = false;
							sErrorMessage = "";
							return;
						} else {
							var sFinalData = that._prepareDataRejection(sData, sAction, sAllComment, sGrowthComment, sDevComment, sCapComment,
								sRevComment);
							that._callService(sFinalData, sModel, sBindingElement.getPath());
							dialog.close();
						}
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
		_prepareDataRejection: function (sData, sAction, sAllComment, sGrowthComment, sDevComment, sCapComment, sRevComment) {
			if (sAction === "Approve") {
				sAction = "A";
			} else {
				sAction = "R";
			}
			return {
				DPNumber: sData.DPNumber,
				WorkitemID: sData.WorkitemID,
				Version: sData.Version,
				Comment: sAllComment,
				Action: sAction,
				Level: sData.Level,
				RG_Comment: sGrowthComment,
				RD_Comment: sDevComment,
				RC_Comment: sCapComment,
				RR_Comment: sRevComment
			};
		}

	});

});