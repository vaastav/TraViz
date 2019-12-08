import React from "react";
import "./table.css";

const NextButton = props => {
    return (
        <input id="next" class="btn" type="button" value="Next"
            onClick={() => {
                var totFilteredRecs = props.ndx.groupAll().value();
                var ofs = props.table.beginSlice();
                var pag = 20;
                var ofs = ofs + pag > totFilteredRecs ? totFilteredRecs : ofs + pag;
                props.table.beginSlice(ofs);
                props.table.endSlice(ofs + pag);
                props.table.redraw();
            }} />
    );
};

const LastButton = props => {
    return (
        <input id="last" class="btn" type="button" value="Last"
            onClick={() => {
                var ofs = props.table.beginSlice();
                var pag = 20;
                var ofs = ofs - pag < 0 ? 0 : ofs - pag;
                props.table.beginSlice(ofs);
                props.table.endSlice(ofs + pag);
                props.table.redraw();
            }} />
    );
};

const SelectAllButton = props => {
    return (
        <input id="selectall" class="btn" type="button" value="Select All"
            onClick={() => {
                console.log("Select All")
                console.log(props)
                props.selAll(props.table)
                props.table.redraw();
            }} />
    );
};

const ResetButton = props => {
    return (
        <input id="reset" class="btn" type="button" value="Reset"
            onClick={() => {
                console.log("Reset")
                console.log(props)
                props.reset(props.table)
                props.table.redraw();
            }} />
    );
};

const CompareButton = props => {
    return (
        <input id="comp" class="btn" type="button" value="Compare"
            onClick={() => {

            }} />
    );
};

const AggregateButton = props => {
    return (
        <input id="agg" class="btn" type="button" value="Aggregate"
            onClick={() => {

            }} />
    );
};

export const Pagination = props => {
    return (
        <div id="paging">
            Showing <span id="begin"></span>-<span id="end"></span> of <span id="size"></span> <span id="totalsize"></span>
            <LastButton table={props.table} ndx={props.ndx} />
            <NextButton table={props.table} ndx={props.ndx} />
            <SelectAllButton selAll={props.selAll} table={props.table} ndx={props.ndx} />
            <ResetButton reset={props.reset} table={props.table} ndx={props.ndx} />
            <CompareButton compare={props.compare} table={props.table} ndx={props.ndx} />
            <AggregateButton agg={props.agg} table={props.table} ndx={props.ndx} />
        </div>
    )
}

export const TableTemplate = props => {
    const context = props.context;
    const [table, updateTable] = React.useState(null);
    const ndx = context.ndx;
    const div = React.useRef(null);
    console.log("Checking props inside table template")
    console.log(props)
    React.useEffect(() => {
        const newTable = props.tableFunction(div.current, ndx);
        newTable.render();
        updateTable(newTable);
    }, 1); {/*Run this exactly once */ }

    return (
        <div ref={div}>
            <label>{props.title}</label>
            <Pagination compare={props.compare} agg={props.agg} reset={props.reset} selAll={props.selAll} table={table} ndx={ndx} />
        </div>
    );
}
