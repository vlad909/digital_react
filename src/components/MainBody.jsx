import React from 'react';
import CanvasDraw from 'react-canvas-draw'
import '../container.css'

class MainBody extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            p: 'move ur body'
        }
    }

    render() {
        return (
            <div className="mid">
                <p className="header-p">Draw here</p>
                <CanvasDraw className="canvas"/>
            </div>
        )
    }
}

export default MainBody