import React from "react";
import * as dc from "dc";
import * as d3 from "d3";
import { TableTemplate } from "./tableTemplate";
import { SrcContext } from "./srcContext";

const tableFunc = (divRef, ndx)=> {
    const srcTable = dc.dataTable(divRef);
    const dimension=ndx.dimension(d=> d.Count);
    var ofs=0;
    var pag=50;
    srcTable.dimension(dimension)
    .group(d=>{return d.Fname;} )
    .columns([
        'Line',
        'Filename',
        'Count'
    ])
    .sortBy(function (d) { return d.Count; })
    .size(Infinity)
    .showGroups(false)
    .on('preRender', function (table) {
        var totFilteredRecs = ndx.groupAll().value();
        var end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
        ofs = ofs >= totFilteredRecs ? Math.floor((totFilteredRecs - 1) / pag) * pag : ofs;
        ofs = ofs < 0 ? 0 : ofs;
        table.beginSlice(ofs);
        table.endSlice(ofs+pag);
    })
    .on('preRedraw', function (table) {
        var totFilteredRecs = ndx.groupAll().value();
        ofs = table.beginSlice();
        var end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
        ofs = ofs >= totFilteredRecs ? Math.floor((totFilteredRecs - 1) / pag) * pag : ofs;
        ofs = ofs < 0 ? 0 : ofs;
        table.beginSlice(ofs);
        table.endSlice(ofs+pag);
    })
    .on('pretransition', function (table) {
        var totFilteredRecs = ndx.groupAll().value();
        var end = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
        d3.select('#begin')
            .text(end === 0? ofs : ofs + 1);
        d3.select('#end')
            .text(end);
        d3.select('#last')
            .attr('disabled', ofs-pag<0 ? 'true' : null);
        d3.select('#next')
            .attr('disabled', ofs+pag>=totFilteredRecs ? 'true' : null);
        d3.select('#size').text(totFilteredRecs);
        if(totFilteredRecs != ndx.size()){
          d3.select('#totalsize').text("(filtered Total: " + ndx.size() + " )");
        }else{
          d3.select('#totalsize').text('');
        }
    });

    return srcTable;
}

export const SourceTable = props => (
    <TableTemplate tableFunction={tableFunc} context={React.useContext(SrcContext)} title="Summary Table" />
)