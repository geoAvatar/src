Xr.data = Xr.data || {};

Xr.data.PointShapeRow = Xr.Class({
	name: "PointShapeRow",
	extend: Xr.data.ShapeRow,
	requires: [Xr.data.IShapeRow],

	construct: function(fid, shapeData) {
		Xr.data.ShapeRow.call(this, fid, shapeData);		
	},
 	
	methods: {
	    createSVG: function (/* CoordMapper */ coordMapper, /* AttributeRow */ attrRow, /* ShapeDrawSymbol */ sym) {

            /*
	        var xmlns = Xr.CommonStrings.SVG_NAMESPACE;
			var point = this.shapeData().data();	
			var circleSVG = document.createElementNS(xmlns, "circle");
			var vp = coordMapper.W2V(point);
			
			circleSVG.setAttribute("cx", vp.x);
			circleSVG.setAttribute("cy", vp.y);
			circleSVG.setAttribute("r", 4);
			
			return circleSVG;
            */

	        var point = this.shapeData().data();
	        return sym.markerSymbol().create(point, coordMapper);//this, attrRow, coordMapper);
	    }
	}
});