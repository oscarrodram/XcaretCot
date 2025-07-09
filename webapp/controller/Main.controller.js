sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/List",
    "sap/m/CustomListItem",
    "sap/m/HBox",
    "sap/m/CheckBox",
    "sap/m/Text",
    "sap/m/Button",
    "sap/m/StandardListItem",
    "comxcaretrepcot/comxcaretrepcot/js/formatter",
    "sap/ui/export/Spreadsheet"
], (Controller, JSONModel, Dialog, List, CustomListItem, HBox, CheckBox, Text, Button, StandardListItem, formatter, Spreadsheet) => {
    "use strict";

    return Controller.extend("comxcaretrepcot.comxcaretrepcot.controller.Main", {

        formatter: formatter, // Referencia al módulo de formateadores

        // Definición de todos los filtros disponibles en la vista
        aAllFilters: [
            { vbox: "vboxFilterFechaCotizacion", label: "Fecha de cotización" },
            { vbox: "vboxFilterProyecto", label: "Proyecto" },
            { vbox: "vboxFilterCotizacion", label: "Cotización" },
            { vbox: "vboxFilterPedidoXdifica", label: "Pedido Xdifica" },
            { vbox: "vboxFilterProveedor", label: "Proveedor" },
            { vbox: "vboxFilterMaterial", label: "Material" },
            { vbox: "vboxFilterCategoria", label: "Categoría" },
            { vbox: "vboxFilterFamilia", label: "Familia" },
            { vbox: "vboxFilterMarca", label: "Marca" },
            { vbox: "vboxFilterModelo", label: "Modelo" },
            { vbox: "vboxFilterDivision", label: "División" },
            { vbox: "vboxFilterArea", label: "Área" },
            { vbox: "vboxFilterUbicacion", label: "Ubicación" },
            { vbox: "vboxFilterSubUbicacion", label: "Sub-ubicación" },
            { vbox: "vboxFilterRequerimiento", label: "Requerimiento" }
        ],

        _sQuotationReportServiceUrl: "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com/QuotationReport",

        /**
         * Genera una cadena de filtro OData basada en el valor de un control de entrada (Input o MultiInput).
         * @param {sap.ui.core.Control} oView - La vista actual.
         * @param {string} sInputId - El ID del control de entrada.
         * @param {string} sODataField - El nombre del campo OData a filtrar.
         * @param {string} [sOperator='EQ'] - El operador OData a usar (ej., 'EQ', 'GE', 'LE').
         * @returns {string|null} La cadena de filtro OData o null si no hay valor.
         */
        getODataFilter: function (oView, sInputId, sODataField, sOperator = 'EQ') {
            var oMultiModel = oView.getModel("multiSelect");
            // Obtiene los valores seleccionados del modelo para MultiInput
            var aValues = oMultiModel && oMultiModel.getProperty("/" + sInputId);
            var oInput = oView.byId(sInputId);

            // Manejo específico para controles sap.m.MultiInput
            if (oInput && oInput.isA && oInput.isA("sap.m.MultiInput")) {
                if (Array.isArray(aValues) && aValues.length > 0) {
                    // Si hay múltiples valores, construye una cláusula 'IN'
                    var sInClause = aValues.map(function (val) {
                        return "'" + String(val).replace(/'/g, "''") + "'";
                    }).join(",");
                    return sODataField + " IN (" + sInClause + ")";
                }
                return null; // No hay valores seleccionados para MultiInput
            }

            // Manejo para otros tipos de controles de entrada (ej., sap.m.Input, sap.m.DatePicker)
            var sValue = oInput && oInput.getValue && oInput.getValue();
            if (sValue) {
                // Para valores individuales, usa el operador especificado
                return sODataField + " " + sOperator + " '" + String(sValue).replace(/'/g, "''") + "'";
            }
            return null; // No hay valor en el control de entrada
        },

        /**
         * Se ejecuta al inicializar el controlador.
         * Inicializa modelos de visibilidad de filtros y columnas, y dispara la búsqueda inicial.
         */
        onInit() {
            this._bIsFirstSearch = true;

            // === Selección dinámica de endpoint según el entorno ===
            var currentUrl = window.location.href || "";
            if (currentUrl.includes("xc-btpdev")) {
                this._sQuotationReportServiceUrl = "https://experiencias-xcaret-parques-s-a-p-i-de-c-v--xc-btpdev-15aca4ac6.cfapps.us10-001.hana.ondemand.com/QuotationReport";
            } else if (currentUrl.includes("qas-btp")) {
                this._sQuotationReportServiceUrl = "https://node.cfapps.us10-001.hana.ondemand.com/QuotationReport";
            }

            // Inicializa el modelo 'visibility' para controlar la visibilidad de los filtros
            var oVisibility = {};
            this.aAllFilters.forEach(function (f) { oVisibility[f.vbox] = true; });
            this.getView().setModel(new JSONModel(oVisibility), "visibility");

            // Inicializa el modelo 'multiSelect' con arrays vacíos para cada MultiInput.
            // Esto asegura que las propiedades existan y sean arrays desde el inicio.
            var oInitialMultiSelectData = {};
            this.aAllFilters.forEach(function (filter) {
                // Asumiendo que 'vboxFilterFechaCotizacion' es un DatePicker y no un MultiInput
                if (filter.vbox !== "vboxFilterFechaCotizacion") {
                    var sInputId = filter.vbox.replace("vboxFilter", "input"); // Convierte vboxFilterProyecto -> inputProyecto
                    oInitialMultiSelectData[sInputId] = [];
                }
            });
            this.getView().setModel(new JSONModel(oInitialMultiSelectData), "multiSelect");

            // Dispara la búsqueda inicial de datos
            this.onSearchQuotation();

            // Definición de todas las columnas de la tabla para control de visibilidad y exportación
            this.aAllColumns = [
                { id: "colIndBorrado", label: "Ind. Borrado" },
                { id: "colNombreProyecto", label: "Proyecto" },
                { id: "colFechaCotizacion", label: "Fecha Cotización" },
                { id: "colNumeroCotizacion", label: "No. Cotización" },
                { id: "colPosCotizacion", label: "Posición Cotización" },
                { id: "colContrato", label: "Contrato" },
                { id: "colPedidoXdifica", label: "Pedido Xdifica" },
                { id: "colProveedor", label: "Proveedor" },
                { id: "colCargo", label: "Cargo" },
                { id: "colEstatusRequerimiento", label: "Estatus Requerimiento" },
                { id: "colNoMaterial", label: "No Material" },
                { id: "colNombre", label: "Nombre Material" },
                { id: "colDescripcion", label: "Descripción Material" },
                { id: "colCantidadSolicitada", label: "Cantidad Solicitada" },
                { id: "colUnidadMedida", label: "Unidad de Medida" },
                { id: "colPrecioNeto", label: "Precio Neto" },
                { id: "colMoneda", label: "Moneda" },
                { id: "colTotal", label: "Total" },
                { id: "colTipoCambio", label: "Tipo de Cambio" },
                { id: "colMontoMN", label: "Monto MN" },
                { id: "colCantidadCotizada", label: "Cantidad Cotizada" },
                { id: "colCantidadFaltante", label: "Cantidad Faltante" },
                { id: "colCategoria", label: "Categoría" },
                { id: "colFamilia", label: "Familia" },
                { id: "colMarca", label: "Marca" },
                { id: "colModelo", label: "Modelo" },
                { id: "colDimensiones", label: "Dimensiones" },
                { id: "colFFEGMFFEDI", label: "FFE GM FFE DI" },
                { id: "colActivoFijo", label: "Activo Fijo" },
                { id: "colEstandar", label: "Estandar" },
                { id: "colPatrimonio", label: "Patrimonio" },
                { id: "colEspeciales", label: "Especiales" },
                { id: "colDivision", label: "División" },
                { id: "colArea", label: "Área" },
                { id: "colUbicacion", label: "Ubicación" },
                { id: "colSubUbicacion", label: "Sub Ubicación" },
                { id: "colSuministrador", label: "Suministrador" },
                { id: "colVista", label: "Vista" },
                { id: "colNumeroRequerimiento", label: "No. Requerimiento" },
                { id: "colPosRequerimiento", label: "Pos. Requerimiento" },
                { id: "colNota", label: "Nota" },
                { id: "colAutor", label: "Autor" },
                { id: "colCreadoEl", label: "Creado el" }
            ];

            // Inicializa el modelo 'columnVisibility' para controlar la visibilidad de las columnas de la tabla
            var oColVis = {};
            this.aAllColumns.forEach(function (col) { oColVis[col.id] = true; });
            this.getView().setModel(new JSONModel(oColVis), "columnVisibility");
        },

        /**
         * Realiza la búsqueda de cotizaciones basándose en los filtros actuales.
         * Construye la URL OData y actualiza la tabla y el total.
         */
        /*
        onSearchQuotation: function () {
            var oView = this.getView();
            var dpFechaCotizacion = oView.byId("dpFechaCotizacion").getDateValue();
            var aFilters = [];

            // Agrega filtro por fecha de cotización si está seleccionada
            if (dpFechaCotizacion) {
                var year = dpFechaCotizacion.getFullYear();
                var month = (dpFechaCotizacion.getMonth() + 1).toString().padStart(2, '0');
                var day = dpFechaCotizacion.getDate().toString().padStart(2, '0');
                var sDate = year + "-" + month + "-" + day;
                aFilters.push("EKKO.AEDAT EQ '" + sDate + "'");
            }

            // Mapeo de IDs de input a nombres de campos OData para construir filtros
            var oCampos = [
                { inputId: "inputNombreProyecto", odata: "T0PEP.NAME1" },
                { inputId: "inputCotizacion", odata: "EKKO.EBELN" },
                { inputId: "inputPedidoXdifica", odata: "EKKO.EBELN1" },
                { inputId: "inputProveedor", odata: "LFA1.NAME1" },
                { inputId: "inputMaterial", odata: "MARA.MATNR" },
                { inputId: "inputCategoria", odata: "T001A.DESC" },
                { inputId: "inputFamilia", odata: "T0F1A.DESC" },
                { inputId: "inputMarca", odata: "T0BR1.DESC" },
                { inputId: "inputModelo", odata: "T0MDL.DESC" },
                { inputId: "inputDivision", odata: "TSPA.VTEXT" },
                { inputId: "inputArea", odata: "T0ARE.DESCRIPTION" },
                { inputId: "inputUbicacion", odata: "EBAN.UBICA" },
                { inputId: "inputSubUbicacion", odata: "EBAN.SUBIC" },
                { inputId: "inputRequerimiento", odata: "EBAN.BANFN" }
            ];
            
            // Itera sobre los campos y agrega filtros si tienen valor
            oCampos.forEach(function (campo) {
                var filtro = this.getODataFilter(oView, campo.inputId, campo.odata);
                if (filtro) aFilters.push(filtro);
            }, this);

            // Combina todos los filtros en una cadena para la URL OData
            var sFilter = aFilters.length ? "$filter=" + aFilters.join(' and ') : "";
            // Usa la URL del servicio definida como propiedad del controlador
            var sUrl = this._sQuotationReportServiceUrl + (sFilter ? "?" + sFilter : "");

            var that = this;
            // Realiza la llamada fetch a la API
            fetch(sUrl)
                .then(response => response.json())
                .then(data => {
                    // Actualiza el modelo de la tabla con los datos obtenidos
                    var oDataQuotation = { listItems: data.result };
                    var oModel = new sap.ui.model.json.JSONModel(oDataQuotation);
                    that.getView().byId("quotationTable").setModel(oModel);

                    // Calcula el total general de los montos
                    var nGrandTotal = 0;
                    (data.result || []).forEach(function (item) {
                        var val = parseFloat(item.TOTAL);
                        if (!isNaN(val)) nGrandTotal += val;
                    });
                    var oTotalsModel = new JSONModel({ grandTotal: nGrandTotal.toFixed(2) });
                    that.getView().setModel(oTotalsModel, "totals");

                    // Muestra un mensaje al usuario sobre el resultado de la búsqueda
                    if (oDataResult.items.length > 0) {
                        if (!this._bIsFirstSearch) {
                            sap.m.MessageToast.show("Información encontrada con los criterios de búsqueda");
                        }
                    } else {
                        if (!this._bIsFirstSearch) {
                            sap.m.MessageToast.show("No se encontraron datos con los criterios de búsqueda");
                        }
                    }
                    this._bIsFirstSearch = false;

                })
                .catch(function (error) {
                    // Muestra un mensaje de error si la consulta falla
                    sap.m.MessageToast.show("Ocurrió un error al consultar la información o no se encontraron datos con los criterios de búsqueda");
                });
        },
        */
        onSearchQuotation: function () {
            var oView = this.getView();
            var aFilters = [];

            // Fecha de cotización
            var drsFechaCotizacion = oView.byId("dpFechaCotizacion");
            if (drsFechaCotizacion) {
                var dFrom = drsFechaCotizacion.getDateValue();
                var dTo = drsFechaCotizacion.getSecondDateValue();
                if (dFrom && dTo) {
                    var sFrom = dFrom.toISOString().slice(0, 10);
                    var sTo = dTo.toISOString().slice(0, 10);
                    aFilters.push("(EKKO.AEDAT BETWEEN DATE '" + sFrom + "' AND DATE '" + sTo + "')");
                } else if (dFrom) {
                    var sFrom = dFrom.toISOString().slice(0, 10);
                    aFilters.push("EKKO.AEDAT '" + sFrom + "'");
                } else if (dTo) {
                    var sTo = dTo.toISOString().slice(0, 10);
                    aFilters.push("EKKO.AEDAT '" + sTo + "'");
                }
            }

            // Mapeo de IDs de input a nombres de campos OData para construir filtros
            var oCampos = [
                { inputId: "inputNombreProyecto", odata: "T0PEP.NAME1" },
                { inputId: "inputCotizacion", odata: "EKKO.EBELN" },
                { inputId: "inputPedidoXdifica", odata: "EKKO.EBELN1" },
                { inputId: "inputProveedor", odata: "LFA1.NAME1" },
                { inputId: "inputMaterial", odata: "MARA.MATNR" },
                { inputId: "inputCategoria", odata: "T001A.DESC" },
                { inputId: "inputFamilia", odata: "T0F1A.DESC" },
                { inputId: "inputMarca", odata: "T0BR1.DESC" },
                { inputId: "inputModelo", odata: "T0MDL.DESC" },
                { inputId: "inputDivision", odata: "TSPA.VTEXT" },
                { inputId: "inputArea", odata: "T0ARE.DESCRIPTION" },
                { inputId: "inputUbicacion", odata: "EBAN.UBICA" },
                { inputId: "inputSubUbicacion", odata: "EBAN.SUBIC" },
                { inputId: "inputRequerimiento", odata: "EBAN.BANFN" }
            ];

            // Itera sobre los campos y agrega filtros si tienen valor
            oCampos.forEach(function (campo) {
                var filtro = this.getODataFilter(oView, campo.inputId, campo.odata);
                if (filtro) aFilters.push(filtro);
            }, this);

            // Combina todos los filtros en una cadena para la URL OData
            var sFilter = aFilters.length ? "$filter=" + aFilters.join(' and ') : "";
            var sUrl = this._sQuotationReportServiceUrl + (sFilter ? "?" + sFilter : "");

            var that = this;
            // Realiza la llamada fetch a la API
            fetch(sUrl)
                .then(function (response) { return response.json(); })
                .then(function (data) {
                    // Actualiza el modelo de la tabla con los datos obtenidos
                    var oDataQuotation = { listItems: data.result };
                    var oModel = new sap.ui.model.json.JSONModel(oDataQuotation);
                    that.getView().byId("quotationTable").setModel(oModel);

                    // Calcula el total general de los montos
                    var nGrandTotal = 0;
                    (data.result || []).forEach(function (item) {
                        var val = parseFloat(item.TOTAL);
                        if (!isNaN(val)) nGrandTotal += val;
                    });
                    var oTotalsModel = new sap.ui.model.json.JSONModel({ grandTotal: nGrandTotal.toFixed(2) });
                    that.getView().setModel(oTotalsModel, "totals");

                    // Muestra un mensaje al usuario sobre el resultado de la búsqueda
                    if (oDataQuotation.listItems.length > 0) {
                        if (!that._bIsFirstSearch) {
                            sap.m.MessageToast.show("Información encontrada con los criterios de búsqueda");
                        }
                    } else {
                        if (!that._bIsFirstSearch) {
                            sap.m.MessageToast.show("No se encontraron datos con los criterios de búsqueda");
                        }
                    }
                    that._bIsFirstSearch = false;
                })
                .catch(function (error) {
                    // Muestra un mensaje de error si la consulta falla
                    sap.m.MessageToast.show("Ocurrió un error al consultar la información o no se encontraron datos con los criterios de búsqueda");
                });
        },

        /**
         * Maneja el evento de solicitud de ayuda de valor (Value Help Request) para los MultiInput.
         * Abre un SelectDialog para que el usuario seleccione una o más opciones.
         * @param {sap.ui.base.Event} oEvent - El evento disparado.
         */
        onValueHelpRequest: function (oEvent) {
            var oInput = oEvent.getSource();
            var sInputId = oInput.getId().split("--").pop(); // Obtiene el ID del input (ej., inputNombreProyecto)
            var oView = this.getView();
            var oMultiModel = oView.getModel("multiSelect");

            // Almacena los tokens actualmente seleccionados para pre-seleccionar en el diálogo
            var aCurrentSelectedTokens = oMultiModel.getProperty("/" + sInputId) || [];

            // Mapeo de IDs de input a nombres de campos OData para filtrar opciones del Value Help
            var mFieldMap = {
                "inputNombreProyecto": "PROJECT_NAME",
                "inputCotizacion": "EBELN",
                "inputPedidoXdifica": "QUOTATION_PED_XDIFICA",
                "inputProveedor": "SUPPLIER_NAME",
                "inputMaterial": "MATNR",
                "inputCategoria": "CATEGORY_DESC",
                "inputFamilia": "FAMILY_DESC",
                "inputMarca": "BRAND_DESC",
                "inputModelo": "MODEL_DESC",
                "inputDivision": "TSPA.VTEXT",
                "inputArea": "T0ARE.DESCRIPTION",
                "inputUbicacion": "EBAN.UBICA",
                "inputSubUbicacion": "EBAN.SUBIC",
                "inputRequerimiento": "EBAN.BANFN"
            };

            // Recopila los filtros actuales de otros campos para enviar a 'getOptions'
            var oCurrentFilters = {};
            Object.keys(mFieldMap).forEach(function (inputId) {
                if (inputId !== sInputId) { // Excluye el input actual de sus propios filtros
                    var oControl = oView.byId(inputId);
                    var multiVal = oMultiModel && oMultiModel.getProperty("/" + inputId);
                    if (Array.isArray(multiVal) && multiVal.length > 0) {
                        oCurrentFilters[mFieldMap[inputId]] = multiVal;
                    } else if (oControl && oControl.getValue) {
                        var val = oControl.getValue();
                        if (val) {
                            oCurrentFilters[mFieldMap[inputId]] = val;
                        }
                    }
                }
            });

            // Obtiene las opciones disponibles para el Value Help desde el Component
            var oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));
            var aOptions = oComponent.getOptions(sInputId, oCurrentFilters);

            // Filtra opciones vacías
            aOptions = aOptions.filter(function (opt) {
                return opt && opt.text && opt.text.trim() !== "";
            });

            // Crea y abre el SelectDialog
            var oDialog = new sap.m.SelectDialog({
                title: "Selecciona una o más opciones",
                // Binding de los ítems del diálogo a las opciones obtenidas
                /*
                items: {
                    path: "/options",
                    template: new sap.m.StandardListItem({
                        title: "{text}",
                        description: "{key}",
                        // Pre-selecciona los ítems que ya están en el modelo
                        selected: {
                            path: "text",
                            formatter: function (sText) {
                                return aCurrentSelectedTokens.includes(sText);
                            }
                        }
                    })
                },
                */
                items: {
                    path: "/options",
                    template: new sap.m.StandardListItem({
                        title: "{text}",        // ← MATERIAL_NAME en inputMaterial
                        description: "{key}",  // ← MATNR en inputMaterial
                        selected: {
                            path: "text",
                            formatter: function (sText) {
                                return aCurrentSelectedTokens.includes(sText);
                            }
                        }
                    })
                },
                multiSelect: true, // Permite selección múltiple
                // Maneja la confirmación de la selección del diálogo
                confirm: function (oConfirmEvent) {
                    var aSelectedItems = oConfirmEvent.getParameter("selectedItems") || [];
                    var aSelectedValues;
                
                    if (sInputId === "inputMaterial") {
                        // Guarda MATNR (description/key)
                        aSelectedValues = aSelectedItems.map(function (item) { return item.getDescription(); });
                    } else {
                        // Guarda el texto (como antes)
                        aSelectedValues = aSelectedItems.map(function (item) { return item.getTitle(); });
                    }
                
                    oMultiModel.setProperty("/" + sInputId, aSelectedValues);
                },
                // Maneja los cambios en vivo en el campo de búsqueda del diálogo
                liveChange: function (oEvent) {
                    var sValue = oEvent.getParameter("value");
                    var oFilter = new sap.ui.model.Filter({
                        path: "text",
                        operator: sap.ui.model.FilterOperator.Contains,
                        value1: sValue
                    });
                    oEvent.getSource().getBinding("items").filter([oFilter]);
                }
            });

            var oDialogModel = new sap.ui.model.json.JSONModel({ options: aOptions });
            oDialog.setModel(oDialogModel);
            oDialog.open();
        },

        /**
         * Maneja el evento `tokenUpdate` de los controles `sap.m.MultiInput`.
         * Se asegura de que el modelo `multiSelect` esté siempre sincronizado con los tokens del control.
         * Se utiliza un `setTimeout` para mitigar problemas de sincronización en el ciclo de vida del UI5,
         * especialmente al borrar tokens manualmente.
         * @param {sap.ui.base.Event} oEvent - El evento disparado por el MultiInput.
         */
        onTokenUpdate: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var sInputId = oMultiInput.getId().split("--").pop(); // Obtiene el ID del input (ej., inputNombreProyecto)
            var oMultiModel = this.getView().getModel("multiSelect");

            // Aplica un pequeño retraso para asegurar que el estado interno del MultiInput
            // se haya actualizado completamente antes de leer sus tokens.
            // Esto es crucial para manejar correctamente las eliminaciones manuales.
            setTimeout(() => {
                let aCurrentMultiInputTokens = oMultiInput.getTokens(); // Obtiene los tokens actuales del control
                let aNewSelectedTexts = [];

                // Verifica que los tokens obtenidos sean un array válido
                if (Array.isArray(aCurrentMultiInputTokens)) {
                    aNewSelectedTexts = aCurrentMultiInputTokens.map(function (oToken) {
                        // Extrae el 'key' o 'text' de cada token
                        return oToken && (oToken.getKey ? oToken.getKey() : oToken.getText());
                    }).filter(Boolean); // Elimina cualquier valor nulo/indefinido que pueda surgir
                } else {
                    // Si getTokens() no devuelve un array, esto es un error crítico inesperado del control
                    sap.m.MessageToast.show("Error interno: No se pudieron leer los tokens del MultiInput. Contacte a soporte.");
                    return;
                }

                // Actualiza la propiedad correspondiente en el modelo 'multiSelect'
                oMultiModel.setProperty("/" + sInputId, aNewSelectedTexts);

                // Si no quedan tokens, limpia el valor de texto del MultiInput para evitar "texto fantasma"
                if (aNewSelectedTexts.length === 0) {
                    oMultiInput.setValue("");
                }

                // Llama a onFilterChange para manejar cualquier lógica de filtros en cascada
                this.onFilterChange({ getSource: () => oMultiInput });

            }, 50); // Retraso de 50 milisegundos
        },

        /**
         * Maneja los cambios en los campos de filtro.
         * Limpia los campos de filtro descendientes cuando un campo superior cambia.
         * @param {sap.ui.base.Event} oEvent - El evento disparado.
         */
        onFilterChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sInputId = oInput.getId().split("--").pop();
            var oView = this.getView();
            var oMultiModel = oView.getModel("multiSelect");
            var oMultiData = oMultiModel.getData();

            // Orden predefinido de los filtros para la limpieza en cascada
            var aFilterOrder = [
                "inputNombreProyecto",
                "inputCotizacion",
                "inputPedidoXdifica",
                "inputProveedor",
                "inputMaterial",
                "inputCategoria",
                "inputFamilia",
                "inputMarca",
                "inputModelo",
                "inputDivision",
                "inputArea",
                "inputUbicacion",
                "inputSubUbicacion",
                "inputRequerimiento"
            ];

            var iChangedIndex = aFilterOrder.indexOf(sInputId);

            // Itera sobre los filtros descendientes y limpia sus valores
            for (var i = iChangedIndex + 1; i < aFilterOrder.length; i++) {
                var sDescendantInputId = aFilterOrder[i];
                var oDescendantInput = oView.byId(sDescendantInputId);
                if (oDescendantInput) {
                    // Limpia el valor de texto en la UI
                    if (oDescendantInput.setValue) {
                        oDescendantInput.setValue("");
                    }
                    // Si es un MultiInput, remueve todos sus tokens.
                    // Esto disparará su propio evento onTokenUpdate, que actualizará el modelo.
                    if (oDescendantInput.isA && oDescendantInput.isA("sap.m.MultiInput")) {
                        oDescendantInput.removeAllTokens();
                    }
                }
                // También asegura que la propiedad en el modelo esté vacía inmediatamente
                oMultiData[sDescendantInputId] = [];
            }

            // Aplica los cambios actualizados al modelo
            oMultiModel.setData(oMultiData);

            // Si el control que disparó el evento NO es un MultiInput (ej. un Input simple),
            // y su valor está vacío, elimina su entrada del modelo.
            if (!(oInput.isA && oInput.isA("sap.m.MultiInput"))) {
                if (oInput.getValue() === "") {
                    delete oMultiData[sInputId];
                    oMultiModel.setData(oMultiData);
                }
            }
        },

        /**
         * Abre un diálogo para que el usuario adapte la visibilidad de los filtros.
         */
        onChangeFilters: function () {
            var oView = this.getView();
            var oVisibilityModel = oView.getModel("visibility");
            var oData = oVisibilityModel.getData();

            // Prepara los ítems para el diálogo de adaptación de filtros
            var aDialogItems = this.aAllFilters.map(function (item) {
                return {
                    vbox: item.vbox,
                    label: item.label,
                    selected: oData[item.vbox] // Estado actual de visibilidad
                };
            });

            var oDialogModel = new JSONModel({ filters: aDialogItems });

            // Destruye el diálogo existente si lo hay para evitar duplicados
            if (this._oAdaptDialog) this._oAdaptDialog.destroy();

            // Crea el nuevo diálogo de adaptación de filtros
            this._oAdaptDialog = new Dialog({
                title: "Adaptar filtros",
                content: [
                    new List({
                        items: {
                            path: "/filters",
                            template: new CustomListItem({
                                content: [
                                    new HBox({
                                        items: [
                                            new CheckBox({
                                                selected: "{selected}" // Binding a la propiedad 'selected'
                                            }),
                                            new Text({
                                                text: "{label}" // Muestra el nombre del filtro
                                            })
                                        ]
                                    })
                                ]
                            })
                        }
                    })
                ],
                // Botón de aceptar para aplicar los cambios de visibilidad
                beginButton: new Button({
                    text: "Aceptar",
                    press: function () {
                        var aFilters = oDialogModel.getProperty("/filters");
                        var oNewVis = {};
                        // Actualiza el modelo de visibilidad con las selecciones del usuario
                        aFilters.forEach(function (item) {
                            oNewVis[item.vbox] = item.selected;
                        });
                        oVisibilityModel.setData(oNewVis);
                        this._oAdaptDialog.close();
                    }.bind(this)
                }),
                // Botón de cancelar para cerrar el diálogo sin aplicar cambios
                endButton: new Button({
                    text: "Cancelar",
                    press: function () { this._oAdaptDialog.close(); }.bind(this)
                })
            });

            this._oAdaptDialog.setModel(oDialogModel);
            // Agrega el diálogo a la vista como dependiente para una gestión de ciclo de vida adecuada
            oView.addDependent(this._oAdaptDialog);
            this._oAdaptDialog.open();
        },

        /**
         * Maneja el evento de sugerencia de los MultiInput.
         * Proporciona sugerencias de autocompletado basadas en los datos disponibles
         * y los filtros actuales.
         * @param {sap.ui.base.Event} oEvent - El evento disparado.
         */
        onSuggestFilters: function (oEvent) {
            var oInput = oEvent.getSource();
            var sInputId = oInput.getId().split("--").pop();
            var sTerm = oEvent.getParameter("suggestValue") || ""; // El valor que el usuario está escribiendo
            var oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this.getView()));

            // Mapeo de IDs de input a nombres de campos OData para recopilar filtros actuales
            var oView = this.getView();
            var oMultiModel = oView.getModel("multiSelect");
            var mFieldMap = {
                "inputNombreProyecto": "PROJECT_NAME",
                "inputCotizacion": "EBELN",
                "inputPedidoXdifica": "QUOTATION_PED_XDIFICA",
                "inputProveedor": "SUPPLIER_NAME",
                "inputMaterial": "MATNR",
                "inputCategoria": "CATEGORY_DESC",
                "inputFamilia": "FAMILY_DESC",
                "inputMarca": "BRAND_DESC",
                "inputModelo": "MODEL_DESC",
                "inputDivision": "TSPA.VTEXT",
                "inputArea": "T0ARE.DESCRIPTION",
                "inputUbicacion": "EBAN.UBICA",
                "inputSubUbicacion": "EBAN.SUBIC",
                "inputRequerimiento": "EBAN.BANFN"
            };

            // Recopila los filtros actuales de otros campos para enviar a 'getOptions'
            var oCurrentFilters = {};
            Object.keys(mFieldMap).forEach(function (inputId) {
                if (inputId !== sInputId) {
                    var oControl = oView.byId(inputId);
                    var multiVal = oMultiModel && oMultiModel.getProperty("/" + inputId);
                    if (Array.isArray(multiVal) && multiVal.length > 0) {
                        oCurrentFilters[mFieldMap[inputId]] = multiVal;
                    } else if (oControl && oControl.getValue) {
                        var val = oControl.getValue();
                        if (val) {
                            oCurrentFilters[mFieldMap[inputId]] = val;
                        }
                    }
                }
            });

            // Obtiene todas las opciones posibles para la sugerencia, aplicando filtros existentes
            var aOptions = oComponent.getOptions(sInputId, oCurrentFilters);

            // Filtra las opciones para asegurar que no haya valores vacíos o nulos
            aOptions = aOptions.filter(function (opt) {
                return opt && opt.text && opt.text.trim() !== "";
            });

            // Filtra las sugerencias basadas en el término actual que el usuario está escribiendo
            var aSuggestions = aOptions.filter(function (opt) {
                return !sTerm || (opt.text && opt.text.toLowerCase().includes(sTerm.toLowerCase()));
            });

            // Crea un modelo JSON con las sugerencias y lo asigna al Input
            var oModel = new sap.ui.model.json.JSONModel(aSuggestions);
            oInput.setModel(oModel);
            // Bindea la agregación 'suggestionItems' para mostrar las sugerencias
            oInput.bindAggregation("suggestionItems", {
                path: "/",
                template: new sap.ui.core.Item({ key: "{key}", text: "{text}" })
            });
        },

        /**
         * Abre un diálogo para que el usuario adapte la visibilidad de las columnas de la tabla.
         */
        onSettingsPress: function () {
            var oView = this.getView();
            var oColVisModel = oView.getModel("columnVisibility");
            var oData = oColVisModel.getData();

            // Prepara los ítems para el diálogo de adaptación de columnas
            var aDialogItems = this.aAllColumns.map(function (col) {
                return {
                    id: col.id,
                    label: col.label,
                    selected: oData[col.id] // Estado actual de visibilidad de la columna
                };
            });

            var oDialogModel = new JSONModel({ columns: aDialogItems });

            // Destruye el diálogo existente si lo hay
            if (this._oColDialog) this._oColDialog.destroy();

            // Crea el nuevo diálogo de adaptación de columnas
            this._oColDialog = new sap.m.Dialog({
                title: "Adaptar columnas",
                content: [
                    new sap.m.List({
                        items: {
                            path: "/columns",
                            template: new sap.m.CustomListItem({
                                content: [
                                    new sap.m.HBox({
                                        items: [
                                            new sap.m.CheckBox({ selected: "{selected}" }),
                                            new sap.m.Text({ text: "{label}" })
                                        ]
                                    })
                                ]
                            })
                        }
                    })
                ],
                // Botón de aceptar para aplicar los cambios de visibilidad de columnas
                beginButton: new sap.m.Button({
                    text: "Aceptar",
                    press: function () {
                        var aCols = oDialogModel.getProperty("/columns");
                        var oNewVis = {};
                        // Actualiza el modelo de visibilidad de columnas
                        aCols.forEach(function (col) {
                            oNewVis[col.id] = col.selected;
                        });
                        oColVisModel.setData(oNewVis);
                        this._oColDialog.close();
                    }.bind(this)
                }),
                // Botón de cancelar para cerrar sin aplicar cambios
                endButton: new sap.m.Button({
                    text: "Cancelar",
                    press: function () { this._oColDialog.close(); }.bind(this)
                })
            });

            this._oColDialog.setModel(oDialogModel);
            oView.addDependent(this._oColDialog);
            this._oColDialog.open();
        },

        /**
         * Exporta los datos de la tabla actual a un archivo Excel (.xlsx).
         */
        onDownloadExcel: function () {
            var oTable = this.byId("quotationTable");
            var oModel = oTable.getModel();
            var aData = oModel.getProperty("/listItems"); // Obtiene los datos de la tabla

            // Define las columnas para el archivo Excel, mapeando etiquetas a propiedades de los datos
            var aCols = [
                { label: "Ind. Borrado", property: "LOEKZ" },
                { label: "Proyecto", property: "PROJECT_NAME" },
                { label: "Fecha Cotización", property: "QUOTATION_DATE" },
                { label: "No. Cotización", property: "EBELN" },
                { label: "Posición Cotización", property: "EBEL" },
                { label: "Contrato", property: "ID_CON" },
                { label: "Pedido Xdifica", property: "QUOTATION_PED_XDIFICA" },
                { label: "Proveedor", property: "SUPPLIER_NAME" },
                { label: "Cargo", property: "QUOTATION_CHARGE" },
                { label: "Estatus Requerimiento", property: "CONF" },
                { label: "No Material", property: "MATNR" },
                { label: "Nombre Material", property: "MATERIAL_NAME" },
                { label: "Descripción Material", property: "MATERIAL_DESC" },
                { label: "Cantidad Solicitada", property: "MENGE" },
                { label: "Unidad de Medida", property: "MEINS" },
                { label: "Precio Neto", property: "NETPR" },
                { label: "Moneda", property: "QUOTATION_CHARGE" },
                { label: "Total", property: "TOTAL" },
                { label: "Tipo de Cambio", property: "TIPO_CAMBIO" },
                { label: "Monto MN", property: "MONTO_MN" },
                { label: "Cantidad Cotizada", property: "KTMNG" },
                { label: "Cantidad Faltante", property: "MENGE_C" },
                { label: "Categoría", property: "CATEGORY_DESC" },
                { label: "Familia", property: "FAMILY_DESC" },
                { label: "Marca", property: "BRAND_DESC" },
                { label: "Modelo", property: "MODEL_DESC" },
                { label: "Dimensiones", property: "MAT_DIMENSIONS" },
                { label: "FFE GM FFE DI", property: "REQ_FFE" },
                { label: "Activo Fijo", property: "MAT_FIXED_ASSET" },
                { label: "Estandar", property: "MAT_STANDARD" },
                { label: "Patrimonio", property: "MAT_PATRIMONIO" },
                { label: "Especiales", property: "MAT_SPECIAL" },
                { label: "División", property: "REQ_DIVISION_DESC" },
                { label: "Área", property: "REQ_AREA_DESC" },
                { label: "Ubicación", property: "REQ_UBICA" },
                { label: "Sub Ubicación", property: "REQ_SUBUBICA" },
                { label: "Suministrador", property: "REQ_SUMIN" },
                { label: "Vista", property: "REQ_VISTA" },
                { label: "No. Requerimiento", property: "BANFN" },
                { label: "Pos. Requerimiento", property: "BNFPO" },
                { label: "Nota", property: "TXZ02" },
                { label: "Autor", property: "CREATION_NAME" },
                { label: "Creado el", property: "ERDAT" }
            ];

            // Crea y construye el objeto Spreadsheet para la exportación
            var oSheet = new Spreadsheet({
                workbook: {
                    columns: aCols
                },
                dataSource: aData,
                fileName: "Cotizaciones.xlsx"
            });

            // Construye el archivo y lo descarga, luego destruye el objeto Spreadsheet
            oSheet.build().then(function () {
                oSheet.destroy();
            });
        }
    });
});
