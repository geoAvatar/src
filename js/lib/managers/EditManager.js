﻿Xr.managers = Xr.managers || {};

Xr.managers.EditManager = Xr.Class({
    name: "EditManager",
    requires: [Xr.IMouseInteraction, Xr.IKeyboardInteraction],

    construct: function (map) {
        this._map = map;
        this._coordMapper = map.coordMapper();

        this._svg = document.createElementNS(Xr.CommonStrings.SVG_NAMESPACE, "svg");
        this._svg.style.position = "absolute";
        this._svg.style.top = "0px";
        this._svg.style.left = "0px";
        this._svg.style.width = "100%";
        this._svg.style.height = "100%";
        this._svg.style.overflow = "hidden";
        this._svg.style.setProperty("pointer-events", "none");

        this._sketch = undefined;
        this._targetGraphicLayer = undefined;
        this._editHistory = new Xr.edit.EditHistory(this);
        this._snapManager = new Xr.edit.SnapManager(this);
    },

    methods: {
        /* SnapManager */ snap: function() {
            return this._snapManager;
        },

        /* GraphicLayer */ targetGraphicLayer: function (/* optional GraphicLayer */ graphicLayer) {
            if (arguments.length == 1) {
                this._targetGraphicLayer = graphicLayer;
            } else {
                return this._targetGraphicLayer;
            }
        },

        history: function() {
            return this._editHistory;
        },

        coordMapper: function() {
            return this._map.coordMapper();
        },

        container: function () {
            return this._svg;
        },

        newPolygon: function (/* int */ id) {
            if (this._map.userMode() == Xr.UserModeEnum.EDIT) {
                this.cancelSketch();

                var polygons = new Array();
                var polygon = new Array();
                polygons.push(polygon);

                var shapeData = new Xr.data.PolygonShapeData(polygons);
                this._sketch = new Xr.edit.PolygonSketch(this, shapeData, id, true);

                return true;
            } else {
                return false;
            }
        },

        newPolyline: function (/* int */ id) {
            if (this._map.userMode() == Xr.UserModeEnum.EDIT) {
                this.cancelSketch();

                var polylines = new Array();
                var polyline = new Array();
                polylines.push(polyline);

                var shapeData = new Xr.data.PolylineShapeData(polylines);
                this._sketch = new Xr.edit.PolylineSketch(this, shapeData, id, true);

                return true;
            } else {
                return false;
            }
        },

        newPoint: function (/* int */ id) {
            if (this._map.userMode() == Xr.UserModeEnum.EDIT) {
                this.cancelSketch();

                var wpt = new Xr.PointD();
                var shapeData = new Xr.data.PointShapeData(wpt);
                this._sketch = new Xr.edit.PointSketch(this, shapeData, id, true);

                return true;
            } else {
                return false;
            }
        },

        newText: function(/* int */ id) {
            if (this._map.userMode() == Xr.UserModeEnum.EDIT) {
                this.cancelSketch();

                var text = { x: 0, y: 0, text: "TEXT" };
                var shapeData = new Xr.data.TextShapeData(text);
                this._sketch = new Xr.edit.TextSketch(this, shapeData, id, true);

                return true;
            } else {
                return false;
            }
        },

        newRectangle: function(/* int */ id) {
            if (this._map.userMode() == Xr.UserModeEnum.EDIT) {
                this.cancelSketch();

                var rect = new Xr.MBR();
                var shapeData = new Xr.data.RectangleShapeData(rect);
                
                this._sketch = new Xr.edit.RectangleSketch(this, shapeData, id, true);

                return true;
            } else {
                return false;
            }
        },

        newEllipse: function (/* int */ id) {
            if (this._map.userMode() == Xr.UserModeEnum.EDIT) {
                this.cancelSketch();

                var data = { cx:0, cy:0, rx:0, ry:0 };
                var shapeData = new Xr.data.EllipseShapeData(data);

                this._sketch = new Xr.edit.EllipseSketch(this, shapeData, id, true);

                return true;
            } else {
                return false;
            }
        },

        _calculateSnapMapPt: function (e) {
            var coordMapper = this._coordMapper;
            var offsetXY = Xr.OperationHelper.offsetXY(e);
            var mapPt = coordMapper.V2W(offsetXY.x, offsetXY.y);
            var snap = this._snapManager;
            var tol = coordMapper.snappingTolerance();
            var result = undefined;

            Xr.UserState.snapMapPt = mapPt;
            Xr.UserState.bSnapVertex = false;
            Xr.UserState.bSnapEdge = false

            if (snap.vertexSnapMode()) {
                result = snap.vertexSnap(mapPt, tol);
                if (result != undefined) {
                    Xr.UserState.bSnapVertex = true;
                }
            }

            if (result == undefined && snap.edgeSnapMode()) {
                result = snap.edgeSnap(mapPt, tol);
                if (result != undefined) {
                    Xr.UserState.bSnapEdge = true;
                }
            }

            if (result != undefined) {
                Xr.UserState.snapMapPt = result.clone();
            }
        },

        mouseDown: function (e) {
            this._calculateSnapMapPt(e);
            Xr.UserState.mouseDownMapSnapPt = Xr.UserState.snapMapPt;
            Xr.UserState.mouseDownAndMoveMapSnapPt = Xr.UserState.snapMapPt;

            if (this._sketch != undefined) {
                return this._sketch.mouseDown(e); // Sketch를 건드렸는지
            } else {
                return false; // Sketch가 없으므로 Sketch를 건드리지 않았음을 의미하는 false.
            }
        },

        mouseMoveOnPanningMode: function(e) {
            this.refreshSketch();
        },

        mouseMove: function (e) {
            this._calculateSnapMapPt(e);

            if (this._sketch != undefined) {
                this._sketch.mouseMove(e);
            }

            if (Xr.UserState.mouseDown) {
                Xr.UserState.mouseDownAndMoveMapSnapPt = Xr.UserState.snapMapPt;
            }
        },

        mouseUp: function (e) {
            this._calculateSnapMapPt(e);

            if (this._sketch != undefined) {
                this._sketch.mouseUp(e);
            }
        },

        click: function (e) {
            this._calculateSnapMapPt(e);

            var bAppend = e.shiftKey;
                        
            var gl = this.targetGraphicLayer();
            var offsetXY = Xr.OperationHelper.offsetXY(e);
            var idArray = gl.IdByMousePoint(offsetXY.x, offsetXY.y, false);

            if (this._sketch && !this._sketch.isNew() && !this._sketch.stay()) {
                this.cancelSketch();
            }

            if (this._sketch && this._sketch.stay()) this._sketch.stay(false);

            if (this._sketch) {
                this._sketch.click(e);
            } else {
                if (idArray.length > 0) {
                    var rows = gl.rowSet().rows();
                    var id = idArray[0];
                    var row = rows[id];
                    var sketch = row.graphicData().toSketch(this, parseInt(id));

                    this.cleanContainer();
                    var svg = sketch.createSVG(this.coordMapper());
                    this.container().appendChild(svg);

                    this._sketch = sketch;
                } else {
                    this.cancelSketch();
                }
            }
        },

        dblClick: function (e) {
            this._calculateSnapMapPt(e);

            if (this._sketch != undefined) {
                this._sketch.dblClick(e);
            }
        },

        keyDown: function (e) {
            if (this._sketch != undefined) {
                this._sketch.keyDown(e);
            }
        },

        keyPress: function (e) {
            if (this._sketch != undefined) {
                this._sketch.keyPress(e);
            }
        },

        keyUp: function (e) {
            if (this._sketch != undefined) {
                this._sketch.keyUp(e);
            }
        },

        cleanContainer: function () {
            var svg = this.container();
            var childNodes = svg.childNodes;
            var cntChildNodes = childNodes.length;
            var childNode;

            for (var i = 0; i < cntChildNodes; i++) {
                childNode = childNodes[0];
                svg.removeChild(childNode);
            }
        },

        cancelSketch: function () {
            this.cleanContainer();
            this._sketch = undefined;
        },

        /* ISketch */ currentSketch: function() {
            return this._sketch;
        },

        /* ISketch */ setSketchById: function (/* int */ id) {
            this.cancelSketch();

            var gl = this.targetGraphicLayer();
            var rows = gl.rowSet().rows();
            var row = rows[id];
            if (row == undefined) return undefined;

            var sketch = row.graphicData().toSketch(this, id);
            var svg = sketch.createSVG(this.coordMapper());
            sketch.stay(true);

            this.container().appendChild(svg);
            this._sketch = sketch;

            return this._sketch;
        },

        refreshSketch: function() {
            if (this._sketch) {
                var id = this._sketch.id();
                this.setSketchById(id);
            }
        },

        /* boolean */ synchronize: function (/* ICommand */ cmd) {
            if (cmd) {
                if (cmd.run()) {
                    var cmdType = cmd.type();

                    if (cmdType == Xr.edit.AddPartCommand.TYPE) {
                        this._sketch.isNew(false);
                        this._sketch.update();
                    } else if (cmdType == Xr.edit.AddVertexCommand.TYPE) {
                        this.refreshSketch();
                    } else if (cmdType == Xr.edit.MoveCommand.TYPE) {
                        this._sketch.stay(true);
                    } else if (cmdType == Xr.edit.MoveControlPointCommand.TYPE) {
                        this._sketch.stay(true);
                    } else if (cmdType == Xr.edit.NewCommand.TYPE) {
                        this._sketch.isNew(false);
                        this._sketch.stay(true);
                        this._sketch.update();
                    } else if (cmdType == Xr.edit.RemoveCommand.TYPE) {
                        this.cancelSketch();
                    } else if (cmdType == Xr.edit.RemovePartCommand.TYPE) {
                        this.refreshSketch();
                    } else if (cmdType == Xr.edit.RemoveVertexCommand.TYPE) {
                        this.refreshSketch();
                    }

                    this._editHistory.add(cmd);

                    var e = Xr.Events.create(Xr.Events.EditCompleted, { editCommandType: cmdType });
                    Xr.Events.fire(this._map.container(), e);
                }
            }

            this._map.update();
        },

        map: function() {
            return this._map;
        },

        update: function () {
            if (this._sketch) {
                this._sketch.update();
            }
        }
    }
});