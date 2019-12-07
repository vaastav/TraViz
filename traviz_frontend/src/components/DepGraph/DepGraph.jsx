import React from "react";
import { Graph } from "react-d3-graph"
import "./depGraph.css"

class DepGraph extends React.Component {
    constructor(props) {
        super(props);
        const data = props.context.ndx; 
        var i;
        const size_min = 500;
        for (i = 0; i < data.nodes.length; i++) {
            data.nodes[i].size = data.nodes[i].size * size_min;
        }
        const config = {
            "collapsible": true,
            "nodeHighlightBehavior": true,
            "linkHighlightBehavior": true,
            "highlightDegree": 1,
            "highlightOpacity": 0.2,
            "height": 770,
            "width": 1100,
            "panAndZoom": false,
            "staticGraph": false,
            "focusZoom": 1,
            "maxZoom": 8,
            "minZoom": 0.1,
            "staticGraphWithDragAndDrop": false,
            "d3": {
                "gravity": -400,
                "linkStrength": 1,
                "linkLength": 300
            },
            "node": {
                "color": "#4e4e50",
                "fontColor": "white",
                "fontSize": 12,
                "fontWeight": "normal",
                "highlightColor": "#b1de00",
                "highlightFontSize": 14,
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
                "color": "#4e4e50",
                "fontColor": "red",
                "fontSize": 10,
                "fontWeight": "normal",
                "highlightColor": "#ffd800",
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
            selectedNodeId: null,
            selectedSources: null,
            selectedTargets: null,
        };
    }

    onClickGraph = () => { return; };
    onClickNode = id => {
        // TODO: Show some info here
        console.log("Clicked node ", id);
        var targets = [];
        var sources = [];
        var i;
        for (i = 0; i < this.state.data.links.length; i++) {
            if (this.state.data.links[i].source === id) {
                targets.push(this.state.data.links[i]);
            }
            if (this.state.data.links[i].target === id) {
                sources.push(this.state.data.links[i]);
            }
        }
        this.setState({selectedNodeId: id, selectedSources: sources, selectedTargets: targets});
        return;
    };

    onDoubleClickNode = id => {
        return;
    };
    
    onRightClickNode = (event, id) => {
        event.preventDefault();
        return;
    };

    onClickLink = (source, target) => { 
        return;
    };

    onRightClickLink = (event, source, target) => {
        event.preventDefault();
        return;
    };

    onMouseOverNode = id => {
        return;
    };

    onMouseOutNode = id => {
        return;
    };

    onMouseOverLink = (source, target) => {
        return;
    };

    onMouseOutLink = (source, target) => {
        return;
    };

    onNodePositionChange = (nodeId, x, y) => {
        return;
    };

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
                <span className="container__graph-info">
                    <b>Nodes: </b> {this.state.data.nodes.length} | <b>Links: </b> {this.state.data.links.length}
                </span>
            </div>
        );
    };

    buildSelectPanel = () => {
        if (this.state.selectedNodeId == null) {
            return (
                <div></div>
            );
        }
        let sender_rows = [];
        for (var i = 0; i < this.state.selectedSources.length; i++) {
            let cells = [];
            cells.push(<td>{this.state.selectedSources[i].source}</td>);
            cells.push(<td>{this.state.selectedSources[i].weight}</td>);
            sender_rows.push(<tr>{cells}</tr>);
        }
        let receiver_rows = [];
        for (var i = 0; i < this.state.selectedTargets.length; i++) {
            let cells = [];
            cells.push(<td>{this.state.selectedTargets[i].target}</td>);
            cells.push(<td>{this.state.selectedTargets[i].weight}</td>);
            receiver_rows.push(<tr>{cells}</tr>);
        }
        return (
            <div>
                <div>
                    <h4>Messages Received</h4>
                    <table>
                        <thead>
                            <th>Service</th>
                            <th># Messages</th>
                        </thead>
                        <tbody>
                            {sender_rows}
                        </tbody>
                    </table>
                </div>
                <div>
                    <h4>Messages Sent</h4>
                    <table>
                        <thead>
                            <th>Service</th>
                            <th># Messages</th>
                        </thead>
                        <tbody>
                            {receiver_rows}
                        </tbody>
                    </table>
                </div>
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

        return (
            <div className="dg_container">
                <div className="container__graph">
                    {this.buildCommonInteractionsPanel()}
                    <Graph ref="graph" {...graphProps} />
                </div>
                <div className="container__form" style={{color: "#bebebe"}}>
                    <h3>Selected Node ID: {this.state.selectedNodeId}</h3>
                    {this.buildSelectPanel()}
                </div>
            </div>
        );
    };
}

export default DepGraph;
