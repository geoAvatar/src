Xr.data = Xr.data || {};

Xr.data.PolylineShapeData = Xr.Class({
	name: "PolylineShapeData",
	requires: [Xr.data.IShapeData, Xr.edit.ISnap],

	construct: function (/* MBR or Array of Array */ arg) {
	    if (arg instanceof Xr.MBR) {
	        this._polylines = new Array();	
	        this._mbr = mbr;
	    } else if (arg instanceof Array) {
	        this._polylines = arg;
	        this._regenMBR();
	    }
	},

	methods: {
	    /* boolean */ hitTest: function (/* number */ x, /* number */ y, /* CoordMapper */ cm) {
	        var coord = cm.V2W(x, y);
	        var polylines = this.data();
	        var ringCount = polylines.length;
	        var tol = cm.pickingTolerance();

	        for (var iRing = 0; iRing < ringCount; ++iRing) {
	            var polyline = polylines[iRing];
	            if (Xr.GeometryHelper.pointInPolyline(polyline, coord, tol)) return true;
	        }

	        return false;
	    },

	    /* ShapeData */ clone: function () {
	        var newParts = new Array();
	        var cntParts = this._polylines.length;

	        for (var iPart = 0; iPart < cntParts; iPart++) {
	            var part = this._polylines[iPart];
	            var newPart = new Array();
	            var cntPts = part.length;
	            for(var iPt=0; iPt < part.length; iPt++) {
	                var pt = part[iPt];
	                var newPt = new Xr.PointD(pt.x, pt.y);
	                newPart[iPt] = newPt;
	            }
	            newParts[iPart] = newPart;
	        }

	        var newThing = new Xr.data.PolylineShapeData(newParts);
	        return newThing;
	    },

		data: function() { 
			return this._polylines;
		},
		
		MBR: function () {
			return this._mbr;
		},

		_regenMBR: function() {
		    var newMBR = new Xr.MBR();
		    newMBR.reset();

		    var polylines = this._polylines;
		    var ringCount = polylines.length;

		    for (var iRing = 0; iRing < ringCount; ++iRing) {
		        var polyline = polylines[iRing];
		        var vertexCount = polyline.length;
		        for (var iVtx = 0; iVtx < vertexCount; ++iVtx) {
		            var wp = polyline[iVtx];
		            newMBR.append(wp);
		        }
		    }

		    this._mbr = newMBR; // Memory Leak ?
		    //this._mbr = new Xr.MBR(newMBR.minX, newMBR.minY, newMBR.maxX, newMBR.maxY);
		},

		representativePoint: function () {
		    return Xr.GeometryHelper.centroidOfPolyline(this._polylines[0]);
		},

	    /* String */ type: function () {
	        return "POLYLINE";
	    },

	    /* ISkecth */ toSketch: function (/* EditManager */ editManager, /* int */ id) {
	        var sketch = new Xr.edit.PolylineSketch(editManager, this, id, false);
	        return sketch;
	    },

	    moveByOffset: function (/* number */ deltaX, /* number */ deltaY) {
	        var polylines = this._polylines;
	        var ringCount = polylines.length;

	        for (var iRing = 0; iRing < ringCount; ++iRing) {
	            var polyline = polylines[iRing];
	            var vertexCount = polyline.length;
	            for (var iVtx = 0; iVtx < vertexCount; ++iVtx) {
	                polyline[iVtx].add(deltaX, deltaY);
	            }
	        }

	        this._mbr.moveByOffset(deltaX, deltaY);
	    },

	    updateControlPoint: function (/* int */ partIndex, /* int */ controlPointIndex, /* PointD */ newPt, /* ouput PointD */ oldPt) {
	        var polylines = this._polylines;
	        var polyline = polylines[partIndex];

	        if (oldPt) oldPt.set(polyline[controlPointIndex].x, polyline[controlPointIndex].y);

	        polyline[controlPointIndex].set(newPt.x, newPt.y);

	        this._regenMBR();
	    },

	    moveControlPointByOffset: function (/* int */ partIndex, /* int */ controlPointIndex, /* number */ deltaX, /* number */ deltaY) {
	        var polylines = this._polylines;
	        var polyline = polylines[partIndex];
	        polyline[controlPointIndex].add(deltaX, deltaY);

	        this._regenMBR();
	    },

	    /* PointD */ removeVertex: function (/* int */ partIndex, /* int */ controlPointIndex) {
	        var polylines = this._polylines;
	        var polyline = polylines[partIndex];

	        var vtx = polyline[controlPointIndex];
	        polyline.splice(controlPointIndex, 1);

	        return vtx;
	    },

	    insertVertex: function (/* int */ partIndex, /* int */ controlPointIndex, /* PointD */ vtx) {
	        var polylines = this._polylines;
	        if (polylines == undefined) return false;

	        var polyline = polylines[partIndex];
	        if (polyline == undefined) return false;

	        polyline.splice(controlPointIndex, 0, vtx);

	        return true;
	    },

	    insertPart: function (/* int */ partIndex, /* Array of PointD */ pointList) {
	        var polylines = this._polylines;
	        if (polylines == undefined) return false;

	        var idxPartInserted = (partIndex == -1) ? polylines.length : partIndex;

	        polylines.splice(idxPartInserted, 0, pointList);
	    },

	    /* Array of PointD */ removePart: function (/* int */ partIndex) {
	        var polylines = this._polylines;
	        var idxPartRemoved = (partIndex == -1) ? (polylines.length - 1) : partIndex;
	        var polyline = polylines[idxPartRemoved];

	        polylines.splice(idxPartRemoved, 1);

	        return polyline;
	    },

	    /* PointD */ vertexSnap: function (/* PointD */ mapPt, /* number */ tol) {
	        if (this.MBR().contain(mapPt, tol)) {
	            var polylines = this._polylines;
	            var ringCount = polylines.length;

	            for (var iRing = 0; iRing < ringCount; ++iRing) {
	                var polyline = polylines[iRing];
	                var vertexCount = polyline.length;
	                for (var iVtx = 0; iVtx < vertexCount; ++iVtx) {
	                    var wp = polyline[iVtx];
	                    if (Xr.GeometryHelper.pointIn(wp.x, wp.y, tol, mapPt)) {
	                        return wp;
	                    }
	                }
	            }
	        }

	        return undefined;
	    },

	    /* PointD */ edgeSnap: function (/* PointD */ mapPt, /* number */ tol) {
	        if (this.MBR().contain(mapPt, tol)) {
	            var polylines = this._polylines;
	            var cntPolylines = polylines.length;

	            for (var iPart = 0; iPart < cntPolylines; iPart++) {
	                polyline = polylines[iPart];
	                var cntVtx = polyline.length - 1;
	                for (var iVtx = 0; iVtx < cntVtx; iVtx++) {
	                    var p1 = polyline[iVtx];
	                    var p2 = polyline[iVtx + 1];
	                    var intPt = Xr.GeometryHelper.intersectPointFromLine(p1, p2, mapPt, tol);
	                    if (intPt) {
	                        return intPt;
	                    }
	                }
	            }
	        }

	        return undefined
	    },

	    /* string */ toWKT: function (/* boolean */ bMulti) {
	        var cntPolylines = this._polylines.length;
	        var result = ""; 

	        for(var iPolyline=0; iPolyline<cntPolylines; ++iPolyline)
	        {
	            var polyline = this._polylines[iPolyline];
	            var cntVertex = polyline.length;
	            var partPolyline = "(";
				
	            for(var iVtx=0; iVtx<cntVertex; ++iVtx)
	            {
	                var vertex = polyline[iVtx];
	                if(iVtx != (cntVertex-1))
	                {
	                    partPolyline += vertex.x + " " + vertex.y + ",";
	                }
	                else
	                {
	                    partPolyline += vertex.x + " " + vertex.y + ")";
	                }
	            }
				
	            if(iPolyline != (cntPolylines-1))
	            {
	                result += partPolyline + ",";
	            }
	            else
	            {
	                result += partPolyline;
	            }
	        }
			
	        if (bMulti) {
	            result = "MULTILINESTRING(" + result + ")";
	        } else {
	            result = "LINESTRING" + result;
	        }

	        return result;
	    },

	    /* boolean */ fromWKT: function (/* String */ wkt) {
	        return false;
	    }
	}
});