import React from "react";
import { Graph } from "react-d3-graph"
import * as d3 from "d3";
import CompareService from "../../services/CompareService/CompareService";
import "./compGraph.css"

class CompareGraph extends React.Component {
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
                "gravity": -400,
                "linkStrength": 1,
                "linkLength": 300
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
        this.state = { 
            trace1: props.trace1, 
            trace2: props.trace2, data: {}, 
            selectedNode: null, 
            config: config, 
            uischema: uischema, 
            loading: false, 
            hasData: false, 
            selNode: null, 
            collapsed: true, 
            originalData: null,
            group1or2nodes: null,
            childrenData: null,
            parentData: null
        };
        this.compareService = new CompareService();
    }

    componentDidMount() {
        if (this.state.hasData) {
            return
        }
        if (this.state.loading) {
            return
        }
        this.setState({loading:true})
        const t1id = this.state.trace1;
        const t2id = this.state.trace2;
        var group1or2nodes = [];
        var childrenData = {};
        var parentData = {};
        this.compareService.compareTraces(t1id, t2id).then(graph => {
            for (var i=0; i < graph.nodes.length; i++){
                var group = graph.nodes[i].group;
                if (group === 1) {
                    graph.nodes[i].color = "#ffe6ff";
                    graph.nodes[i].clickType = "detail";
                    graph.nodes[i].collapsible = false;
                    group1or2nodes.push(graph.nodes[i]);
                } else if (group === 2) {
                    graph.nodes[i].color = "#66ff33";
                    graph.nodes[i].clickType = "detail";
                    graph.nodes[i].collapsible = false;
                    group1or2nodes.push(graph.nodes[i]);
                } else {
                    graph.nodes[i].color = "#999999";
                    graph.nodes[i].clickType = "detail";
                    graph.nodes[i].collapsible = true;
                }
                childrenData[graph.nodes[i].id] = [];
                parentData[graph.nodes[i].id] = [];
                if (graph.nodes[i].data.ParentEventID !== null) {
                    for (var j = 0; j < graph.nodes[i].data.ParentEventID.length; j++)  {
                        parentData[graph.nodes[i].id].push(graph.nodes[i].data.ParentEventID[j]);
                    }
                }
            }
            for (var i=0; i < graph.links.length; i++) {
                childrenData[graph.links[i].source].push(graph.links[i].target);
            }
            this.state.data = graph;
            this.setState({data: graph, loading: false, hasData: true, originalData: graph, group1or2nodes: group1or2nodes, childrenData: childrenData, parentData: parentData})
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
        if (chosenNode.clickType == "detail") {
            this.setState({selectedNode: id, selNode: chosenNode});
        } else if (chosenNode.clickType == "expand") {
            console.log(chosenNode);
        }
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

    collapseAll = () => {
        // Step 1: Only keep nodes that are either group 1 or group 2
        var nodes = []
        var links = []
        var group1or2s = {};
        for (var i = 0; i < this.state.group1or2nodes.length; i++) {
            var newNode = {};
            for (var prop in this.state.group1or2nodes[i]) {
                if (Object.prototype.hasOwnProperty.call(this.state.group1or2nodes[i], prop)) {
                    newNode[prop] = this.state.group1or2nodes[i][prop];
                }
            }
            nodes.push(newNode);
            group1or2s[this.state.group1or2nodes[i].id] = true;
        }
        // Step 2: Figure out how many collapsed nodes we need by doing a search.
        // Stop whenever the search finds a group 1 or group 2 node.
        // Keep track of what nodes have been visited for not doing extra work.
        // Step 3: Merge all the found nodes and form new links.
        var nodeID = 0;
        for (var prop in group1or2s) {
            var parents = this.state.parentData[prop];
            for (var i = 0; i < parents.length; i++) {
                if (Object.prototype.hasOwnProperty.call(group1or2s, parents[i])) {
                    var newLink = {};
                    newLink["source"] = parents[i];
                    newLink["target"] = prop;
                    links.push(newLink);
                } else {
                    var earliest_collapsible_ancestor = parents[i]
                    var ancestors = this.state.parentData[parents[i]];
                    if (ancestors.length === 0) {
                        console.log("No ancestor");
                        var newNode = {};
                        newNode["id"] = nodeID;
                        nodeID++;
                        newNode.color = "#999999";
                        newNode.clickType = "expand";
                        newNode.collapsible = false;
                        newNode.type = "square";
                        newNode.earliest_child = parents[i];
                        newNode.contained = [parents[i]];
                        nodes.push(newNode);
                        var newLink = {};
                        newLink.source = newNode.id;
                        newLink.target = prop;
                        links.push(newLink);
                    } else {

                    }
                }
            }
        }
        // Step 4: Set the state's data to the new graph.
        var newData = {};
        newData["nodes"] = nodes
        newData["links"] = links
        this.setState({collapsed: true, data: newData});
    };

    expandAll = () => {
        // Reset the state data to be the original expanded data :)
        this.setState({collapsed: false, data: this.state.originalData})
    };

    buildCommonInteractionsPanel = () => {
        const collapseBtnStyle = {
            cursor: this.state.collapsed ? "not-allowed" : "pointer",
        };
        const expandBtnStyle = {
            cursor: this.state.collapsed ? "pointer" : "not-allowed",
        };
        d3.select('#collapse')
            .attr('disabled', this.state.collapsed ? 'true' : null);
        d3.select('#expand')
            .attr('disabled', this.state.collapsed ? 'true' : null);
        return (
            <div>
                <button id="#collapse" onClick={this.collapseAll} style={collapseBtnStyle} className="btn btn-default btn-margin-left">
                    Collapse
                </button>
                <button id="#expand" onClick={this.expandAll} style={expandBtnStyle} className="btn btn-default btn-margin-left">
                    Expand
                </button>
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
        if (this.state.selNode.clickType !== "detail") {
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

export default CompareGraph
