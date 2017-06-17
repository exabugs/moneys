import React from 'react';
import { Table, TableBody, TableRow, TableRowColumn } from 'material-ui/Table';

const items = ['a', 'b', 'c'];

const About = () => (
  <div>
    <Table multiSelectable={true}>
      <TableBody deselectOnClickaway={false}>

        <TableRow>
          <TableRowColumn>
            hello
          </TableRowColumn>
        </TableRow>

        <TableRow checked={true}>
          <TableRowColumn>
            world
          </TableRowColumn>
          <TableRowColumn>
            world
          </TableRowColumn>
        </TableRow>

        <TableRow>
          <TableRowColumn>
            hello
          </TableRowColumn>
          <TableRowColumn>
            hello
          </TableRowColumn>
        </TableRow>

        <TableRow selected={true}>
          <TableRowColumn>
            world
          </TableRowColumn>
          <TableRowColumn>
            world
          </TableRowColumn>
        </TableRow>

        <TableRow>
          <TableRowColumn>
            hello
          </TableRowColumn>
          <TableRowColumn>
            hello
          </TableRowColumn>
        </TableRow>

        <TableRow selected={true}>
          <TableRowColumn>
            world
          </TableRowColumn>
          <TableRowColumn>
            world
          </TableRowColumn>
        </TableRow>

        {
          items.map(item =>
            <TableRow selected={true}>
              <TableRowColumn>
                {item}
              </TableRowColumn>
              <TableRowColumn>
                {item}
              </TableRowColumn>
            </TableRow>
          )
        }

      </TableBody>
    </Table>
  </div>
);

export default About;
