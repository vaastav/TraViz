import React from "react";
import { CXContext } from "./cxContext";
import * as dc from "dc";

const NextButton = props => {
    return (
        <input id="next" class="btn" type="button" value="Next"
            onClick={() => {
                var totFilteredRecs = props.ndx.groupAll().value();
                var ofs = props.table.beginSlice();
                var pag = 50;
                var ofs = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
                props.table.beginSlice(ofs);
                props.table.endSlice(ofs+pag);
                props.table.redraw();
            }} />
    );
};

const LastButton = props => {
    return (
        <input id="last" class="btn" type="button" value="Last"
            onClick={() => {
                var ofs = props.table.beginSlice();
                var pag = 50;
                var ofs = ofs - pag < 0 ? 0 : ofs - pag;
                props.table.beginSlice(ofs);
                props.table.endSlice(ofs+pag);
                props.table.redraw();
            }} />
    );
};

export const Pagination = props => {
    return (
        <div id="paging">
            Showing <span id="begin"></span>-<span id="end"></span> of <span id="size"></span> <span id="totalsize"></span>
            <LastButton table={props.table} ndx={props.ndx}/>
            <NextButton table={props.table} ndx={props.ndx}/>
        </div>
    )
}

export const TableTemplate = props => {
    const context = props.context;
    const [table,updateTable] = React.useState(null);
    const ndx = context.ndx;
    const div = React.useRef(null);
    React.useEffect(() => {
        const newTable = props.tableFunction(div.current, ndx);
        newTable.render();
        updateTable(newTable);
    },1); {/*Run this exactly once */}

    return (
        <div ref={div}>
            <label>{props.title}</label>
            <Pagination table={table} ndx={ndx}/>
        </div>
    );
}
