import React from "react";
import { Graph } from "react-d3-graph";
import * as d3 from "d3";
import AggregateService from "../../services/AggregateService/AggregateService";
import "./AggregateGraph.css"

class AggregateGraph extends React.Component {
    constructor(props) {
        super(props);
        const config = {
            "collapsible": false,
            "nodeHighlightBehavior": false,
            "linkHighlightBehavior": false,
            "highlightDegree": 1,
            "highlightOpacity": 0.2,
            "height": 600,
            "width": 800,
            "panAndZoom": true,
            "directed": true,
            "staticGraph": false,
            "focusZoom": 0.1,
            "maxZoom": 8,
            "minZoom": 0.1,
            "staticGraphWithDragAndDrop": false,
            "d3": {
                "gravity": -600,
                "linkStrength": 1,
                "linkLength": 600
            },
            "node": {
                "fontColor": "#ff4500",
                "fontSize": 12,
                "fontWeight": "normal",
                "mouseCursor": "pointer",
                "opacity": 1,
                "renderLabel": false,
                "size": 450,
                "strokeColor": "none",
                "strokeWidth": 1.5,
                "svg": "",
                "symbolType": "circle"
            },
            "link": {
                "color": "#999999",
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
        console.log(props.tid_list);
        this.state = {
            traces: props.tid_list,
            loading: false,
            hasData: false,
            data: null,
            selectedNode: null,
            selNode: null,
            config: config,
            uischema: uischema
        };
        this.aggregateService = new AggregateService();
    }

    componentDidMount() {
        if (this.state.hasData) {
            return
        }
        if (this.state.loading) {
            return
        }
        this.setState({ loading: true });
        const traces = this.state.traces;
        this.aggregateService.getAggregate(traces).then(graph => {
            var color_scale = d3.scaleLinear()
                                .domain([0, 1])
                                .range(["#ffffff", "#999900"])
            for (var i=0; i < graph.nodes.length; i++){
                graph.nodes[i].color = color_scale(graph.nodes[i].value);
            }
            this.setState({ loading: false, hasData: true, data: graph });
        });
    }

    onClickGraph = () => { return; };
    onClickNode = id => {
        var chosenNode;
        for (var i = 0; i < this.state.data.nodes.length; i++) {
            if (this.state.data.nodes[i].id == id) {
                chosenNode = this.state.data.nodes[i];
            }
        }
        this.setState({selectedNode: id, selNode: chosenNode});
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
        return (
            <div>
                <span className="container__graph-info">
                    <b>Nodes: </b> {this.state.data.nodes.length} | <b>Links: </b> {this.state.data.links.length}
                </span>
            </div>
        );
    };

    buildEventPanel = () => {
        if (this.state.selectedNode === null) {
            return (
                <div></div>
            );
        }
        var nodeData = this.state.selNode.data
        let rows = [];
        for (var prop in nodeData) {
            if (Object.prototype.hasOwnProperty.call(nodeData,prop)) {
                let cells = [];
                cells.push(<td>{prop}</td>);
                if (Array.isArray(nodeData[prop])) {
                    cells.push(<td>{nodeData[prop].join()}</td>);
                } else {
                    cells.push(<td>{nodeData[prop]}</td>);
                }
                rows.push(<tr>{cells}</tr>);
            }
        }
        return (
            <div>
                <table>
                    <tbody style={{"overflowX": "hidden"}}>
                        {rows}
                    </tbody>
                </table>
            </div>
        );
    };

    render() {

        if (!this.state.hasData) {
            return null;
        }
        const data = {
            nodes: this.state.data.nodes,
            links: this.state.data.links
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
            <div className="cg_container">
                <div className="container__graph">
                    {this.buildCommonInteractionsPanel()}
                    <Graph ref="graph" {...graphProps} />
                </div>
                <div className="container__form">
                    <h3> Selected Event : {this.state.selectedNode}</h3>
                    {this.buildEventPanel()}
                </div>
            </div>
        );
    }
}

export default AggregateGraph
