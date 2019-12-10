import React from "react";
import { Graph } from "react-d3-graph";
import AggregateService from "../../services/AggregateService/AggregateService";
import Cytoscape from 'cytoscape'
import CytoscapeComponent from 'react-cytoscapejs';
import "./AggregateGraph.css"
import COSEBilkent from 'cytoscape-cose-bilkent';

let elements = [
    { data: { id: 'one', label: 'Node 1' } },
    { data: { id: 'two', label: 'Node 2' } },
    { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } }
];

Cytoscape.use(COSEBilkent);

class AggregateGraph extends React.Component {
    constructor(props) {
        super(props);
        console.log(props.tid_list);
        this.state = {
            traces: props.tid_list,
            loading: false,
            hasData: false,
            data: null
        };
        this.aggregateService = new AggregateService();
    }

    buildEventPanel = () => {
        if (this.state.selectedNode === null) {
            return (
                <div></div>
            );
        }
        // if (this.state.selNode.clickType !== "detail") {
        //     return (
        //         <div></div>
        //     );
        // }
        // var nodeData = this.state.selNode.data
        // let rows = [];
        // for (var prop in nodeData) {
        //     if (Object.prototype.hasOwnProperty.call(nodeData, prop)) {
        //         console.log(prop, " : ", nodeData[prop]);
        //         let cells = [];
        //         cells.push(<td>{prop}</td>);
        //         if (Array.isArray(nodeData[prop])) {
        //             cells.push(<td>{nodeData[prop].join()}</td>);
        //         } else {
        //             cells.push(<td>{nodeData[prop]}</td>);
        //         }
        //         rows.push(<tr>{cells}</tr>);
        //     }
        // }
        // return (
        //     <div>
        //         <table>
        //             <tbody style={{ "overflowX": "hidden" }}>
        //                 {rows}
        //             </tbody>
        //         </table>
        //     </div>
        // );
    };

    componentDidMount() {
        if (this.state.hasData) {
            return
        }
        if (this.state.loading) {
            return
        }
        this.setUpListeners();
        this.setState({ loading: true });
        const traces = this.state.traces;
        this.aggregateService.getAggregate(traces).then(graph => {
            console.log(graph)
            this.setState({ loading: false, hasData: true });
        });
    }


    setUpListeners = () => {
        this.cy.on('click', 'node', (event) => {
            console.log(event.target)
        })

        this.cy.on('mouseover', 'node', (event) => {
            console.log("mouseover");
            let node = event.target;
            node.addClass('highlight');
        });

        this.cy.on('mouseout', 'node', (event) => {
            console.log("mouseout");
            let node = event.target;
            node.removeClass('highlight');
        });
        
    }

    render() {
        let layout = { name: "cose-bilkent" }

        let style = {
            width: '100%',
            height: '100%',
        }

        let stylesheet = [
            {
                selector: '*',
                style: {
                    "width": "100%",
                    "height": "100%",
                }
            },
            {
                selector: 'node',
                style: {
                    "background-color": "#d6d8da",
                    "size": 450,
                    "label": 'data(label)',
                    "color": "#d6d8da",
                }
            },
            {
                selector: 'node.highlight',
                style: {
                    "background-color": "#b1de00",
                    "size": 450,
                    "label": 'data(label)',
                    "color": "#d6d8da",
                }
            },
            {
                selector: 'edge',
                style: {
                    width: 4,
                    'line-color': '#d6d8da',
                }
            }
        ];

        return (
            <div className="cg_container">
                <div className="container__graph">
                    <CytoscapeComponent elements={elements} layout={layout} style={style} stylesheet={stylesheet} cy={(cy) => { this.cy = cy }} />
                </div>
                <div className="container__form">
                    <h3> Selected Event : Bleh</h3>
                    {this.buildEventPanel()}
                </div>
            </div>
        );
    }
}

export default AggregateGraph
