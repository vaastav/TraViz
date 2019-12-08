import React from "react";
import { Graph } from "react-d3-graph"
import CompareService from "../../services/CompareService/CompareService";
import "./compGraph.css"

class CompareGraph extends React.Component {
    constructor(props) {
        super(props);
        const config = {
            "collapsible": true,
            "nodeHighlightBehavior": false,
            "linkHighlightBehavior": false,
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
                "color": "#d6d8da",
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
        this.state = { trace1: props.trace1, trace2: props.trace2, data: {}, selectedNode: null, config: config, uischema: uischema, loading: false, hasData: false};
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
        this.compareService.compareTraces(t1id, t2id).then(graph => {
            this.state.data = graph;
            this.setState({data: graph, loading: false, hasData: true})
        });
    }

    onClickGraph = () => { return; };
    onClickNode = id => {
        this.setState({selectedNode: id});
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

    render() {
        console.log(this.state.hasData);
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
                    <Graph ref="graph" {...graphProps} />
                </div>
                <div className="container__form">
                    <h3> Selected Event </h3>
                </div>
            </div>
        );
    }
}

export default CompareGraph
