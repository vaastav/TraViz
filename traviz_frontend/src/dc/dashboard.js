import React from 'react'
import {Grid,Row,Col} from 'react-flexbox-grid'
import { TraceTable } from "./traceTable";
import { DataContext } from "./cxContext";
import { css } from 'glamor';

export const Dashboard = (props)=>{

    const style = css({
        padding:'1rem',
        marginTop:'2rem'
    })
    return(
        <div {...style}>
        <DataContext>
                <Row>
                    <Col md={12} >
                        <TraceTable />
                    </Col>
                </Row>
        </DataContext>
        </div>
    )
}
