import React from "react";
import { Graph } from "react-d3-graph"

class DepGraph extends React.Component {
    constructor(props) {
        super(props);
        const data = props.context.ndx; 
        const config = {
            "collapsible": true,
            "nodeHighlightBehavior": true,
            "linkHighlightBehavior": true,
            "highlightDegree": 1,
            "highlightOpacity": 0.2,
            "node": {
                "color": "#d3d3d3",
                "fontColor": "black",
                "fontSize": 12,
                "fontWeight": "normal",
                "highlightColor": "#950740",
                "highlightFontSize": 12,
                "highlightFontWeight": "bold",
                "highlightStrokeColor": "SAME",
                "highlightStrokeWidth": 1.5,
                "mouseCursor": "pointer",
                "opacity": 1,
                "renderLabel": true,
                "size": 450,
                "strokeColor": "none",
                "strokeWidth": 1.5,
                "svg": "",
                "symbolType": "circle"
            },
            "link": {
                "color": "#d3d3d3",
                "fontColor": "red",
                "fontSize": 10,
                "fontWeight": "normal",
                "highlightColor": "#1a1a1d",
                "highlightFontSize": 8,
                "highlightFontWeight": "bold",
                "mouseCursor": "pointer",
                "opacity": 1,
                "renderLabel": true,
                "semanticStrokeWidth": false,
                "strokeWidth": 4,
                "markerHeight": 6,
                "markerWidth": 6
            },
        };
        const uischema = {
            height: { "ui:readonly": "true" },
            width: { "ui:readonly": "true" },
        };
        console.log(data);
        this.state = {
            config,
            uischema,
            data,
            nodeIdToRemove: null,
        };
    }

    onClickGraph = () => { return; };
    onClickNode = id => {
        // TODO: Show some info here
        return;
    };
    
    onRightClickNode = (event, id) => {
        event.preventDefault();
        console.info(`Right clicked node ${id}`);
    };

    onClickLink = (source, target) => console.info(`Clicked link between ${source} and ${target}`);

    onRightClickLink = (event, source, target) => {
        event.preventDefault();
        console.info(`Right clicked link between ${source} and ${target}`);
    };

    onMouseOverNode = id => console.info(`Do something when mouse is over node (${id})`);

    onMouseOutNode = id => console.info(`Do something when mouse is out of node (${id})`);

    onMouseOverLink = (source, target) =>
        console.info(`Do something when mouse is over link between ${source} and ${target}`);

    onMouseOutLink = (source, target) =>
        console.info(`Do something when mouse is out of link between ${source} and ${target}`);

    onNodePositionChange = (nodeId, x, y) =>
        console.info(`Node ${nodeId} is moved to new position. New position is (${x}, ${y}) (x,y)`);

    onClickAddNode = () => {
        return;  
    };

    onClickRemoveNode = () => {
        return;
    };

    buildCommonInteractionsPanel = () => {
        const btnStyle = {
            cursor: "pointer",
        };
        return (
            <div>
                <button onClick={this.onClickAddNode} className="btn btn-default btn-margin-left">
                    +
                </button>
                <button onClick={this.onClickRemoveNode} className="btn btn-default btn-margin-left">
                    -
                </button>
                <span className="container__graph-info">
                    <b>Nodes: </b> {this.state.data.nodes.length} | <b>Links: </b> {this.state.data.links.length}
                </span>
            </div>
        );
    };

    render() {
        // This does not happens in this sandbox scenario running time, but if we set staticGraph config
        // to true in the constructor we will provide nodes with initial positions
        const data = {
            nodes: this.state.data.nodes,
            links: this.state.data.links,
        };

        const graphProps = {
            id: "graph",
            data,
            config: this.state.config,
            onClickNode: this.onClickNode,
            onDoubleClickNode: this.onDoubleClickNode,
            onRightClickNode: this.onRightClickNode,
            onClickGraph: this.onClickGraph,
            onClickLink: this.onClickLink,
            onRightClickLink: this.onRightClickLink,
            onMouseOverNode: this.onMouseOverNode,
            onMouseOutNode: this.onMouseOutNode,
            onMouseOverLink: this.onMouseOverLink,
            onMouseOutLink: this.onMouseOutLink,
            onNodePositionChange: this.onNodePositionChange,
        };

        graphProps.config = Object.assign({}, graphProps.config, {
            height: window.innerHeight,
            width: window.innerWidth,
        });

        return (
            <div>
                {this.buildCommonInteractionsPanel()}
                <Graph ref="graph" {...graphProps} />
            </div>
        );
    };
}

export default DepGraph;
