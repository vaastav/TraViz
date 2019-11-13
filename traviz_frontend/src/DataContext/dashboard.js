import React from 'react';
import { Row,Col } from 'react-flexbox-grid';
import { DataContext } from "./cxContext";
import { TraceTable } from "./traceTable";

export const Dashboard = (props)=>{
    return (
        <div>
        <DataContext>
            <Row>
                <Col md={12}>
                    <TraceTable />
                </Col>
            </Row>
        </DataContext>
        </div>
    );
}