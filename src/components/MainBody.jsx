import React from 'react';
import CanvasDraw from 'react-canvas-draw'
import '../container.css'
import brain from 'brain.js'
import trainData from '../assets/data/mnistTrain.json'

const net = new brain.NeuralNetwork();
net.fromJSON(trainData);

class MainBody extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            byteImage: 'bla',
            net: '',
            json: '',
            result: [],
            max_obj: {}
        }
    }

    centerImage(img) {
        var meanX = 0;
        var meanY = 0;
        var rows = img.length;
        var columns = img[0].length;
        var sumPixels = 0;
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < columns; x++) {
                var pixel = (1 - img[y][x]);
                sumPixels += pixel;
                meanY += y * pixel;
                meanX += x * pixel;
            }
        }
        meanX /= sumPixels;
        meanY /= sumPixels;

        var dY = Math.round(rows / 2 - meanY);
        var dX = Math.round(columns / 2 - meanX);
        return {transX: dX, transY: dY};
    }

    getBoundingRectangle(img, threshold) {
        var rows = img.length;
        var columns = img[0].length;
        var minX = columns;
        var minY = rows;
        var maxX = -1;
        var maxY = -1;
        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < columns; x++) {
                if (img[y][x] < threshold) {
                    if (minX > x) minX = x;
                    if (maxX < x) maxX = x;
                    if (minY > y) minY = y;
                    if (maxY < y) maxY = y;
                }
            }
        }
        return {minY: minY, minX: minX, maxY: maxY, maxX: maxX};
    }

    imageDataToGrayscale(imgData) {
        var grayscaleImg = [];
        for (var y = 0; y < imgData.height; y++) {
            grayscaleImg[y] = [];
            for (var x = 0; x < imgData.width; x++) {
                var offset = y * 4 * imgData.width + 4 * x;
                var alpha = imgData.data[offset + 3];
                // weird: when painting with stroke, alpha == 0 means white;
                // alpha > 0 is a grayscale value; in that case I simply take the R value
                if (alpha == 0) {
                    imgData.data[offset] = 255;
                    imgData.data[offset + 1] = 255;
                    imgData.data[offset + 2] = 255;
                }
                imgData.data[offset + 3] = 255;
                // simply take red channel value. Not correct, but works for
                // black or white images.
                grayscaleImg[y][x] = imgData.data[y * 4 * imgData.width + x * 4 + 0] / 255;
            }
        }
        return grayscaleImg;
    }

    componentDidMount() {
        // let net = new brain.NeuralNetwork()
        // net.fromJSON(trainData)
        // this.setState({
        //     net: new brain.NeuralNetwork()
        // })
        // this.setState({
        //     json: this.state.net.fromJSON(trainData)
        // })
    }

    render() {
        let result = this.state.result ? this.state.result.map((_, index) => {
            return (
                <li key={index}> {index} => {_}</li>
            )
        }) : '';
        // let max_el = () => {
        //     let max = Math.max(...this.state.result);
        //     return (
        //         <ul>
        //             <li>max : {max}</li>
        //             <li>число : {this.state.result.findIndex(_ => _ === max)}</li>
        //         </ul>
        //     )
        // }
        return (
            <div className="mid">
                <canvas ref={hidden => this.hiddenCanvas = hidden} width="280" height="280"
                        style={{display: 'none'}}></canvas>
                <p className="header-p">Draw here</p>
                <CanvasDraw className="canvas"
                            brushColor="black"
                            brushRadius={10}
                            hideGrid={true}
                            style={{
                                'margin': '10px 50px',
                                'border': '5px black solid',
                                width: '280px',
                                height: '280px'
                            }}
                            ref={canvasDraw => {
                                this.saveCanvas = canvasDraw
                            }}/>
                {/*<p>byte {this.state.byteImage}</p>*/}
                <button type="button" onClick={() => {
                    // console.log(this.saveCanvas, 'fsd')
                    let context = this.saveCanvas.ctx.drawing
                    let image = context.getImageData(0, 0,
                        this.saveCanvas.canvas.drawing.width, this.saveCanvas.canvas.drawing.height)
                    let grayscaleImg = this.imageDataToGrayscale(image)
                    let boundingRectangle = this.getBoundingRectangle(grayscaleImg, 0.01);
                    let trans = this.centerImage(grayscaleImg)
                    this.hiddenCanvas.width = image.width
                    this.hiddenCanvas.height = image.height
                    let copyCtx = this.hiddenCanvas.getContext('2d')
                    let brW = boundingRectangle.maxX + 1 - boundingRectangle.minX;
                    let brH = boundingRectangle.maxY + 1 - boundingRectangle.minY;
                    let scaling = 190 / (brW > brH ? brW : brH);
                    // scale
                    copyCtx.translate(this.saveCanvas.canvas.drawing.width / 2, this.saveCanvas.canvas.drawing.height / 2);
                    copyCtx.scale(scaling, scaling);
                    copyCtx.translate(-this.saveCanvas.canvas.drawing.width / 2, -this.saveCanvas.canvas.drawing.height / 2);
                    // translate to center of mass
                    copyCtx.translate(trans.transX, trans.transY);

                    copyCtx.drawImage(context.canvas, 0, 0);
                    image = copyCtx.getImageData(0, 0, 280, 280);
                    grayscaleImg = this.imageDataToGrayscale(image);
                    // console.log(grayscaleImg, 'gray')
                    // this.setState({byteImage: image})
                    let nnInput = new Array(784), nnInput2 = [];
                    for (let y = 0; y < 28; y++) {
                        for (let x = 0; x < 28; x++) {
                            let mean = 0;
                            for (let v = 0; v < 10; v++) {
                                for (let h = 0; h < 10; h++) {
                                    mean += grayscaleImg[y * 10 + v][x * 10 + h];
                                }
                            }
                            mean = (1 - mean / 100); // average and invert
                            nnInput[x * 28 + y] = (mean - .5) / .5;
                        }
                    }
                    let thumbnailCtx = this.smallCanvas.getContext('2d')
                    let thumbnail = thumbnailCtx.getImageData(0, 0, 28, 28);
                    if (true) {
                        context.clearRect(0, 0, this.saveCanvas.canvas.drawing.width, this.saveCanvas.canvas.drawing.height);
                        context.drawImage(this.hiddenCanvas.getContext('2d').canvas, 0, 0);
                        for (let y = 0; y < 28; y++) {
                            for (let x = 0; x < 28; x++) {
                                let block = context.getImageData(x * 10, y * 10, 10, 10);
                                let newVal = 255 * (0.5 - nnInput[x * 28 + y] / 2);
                                nnInput2.push(Math.round((255 - newVal) / 255 * 100) / 100);
                                for (let i = 0; i < 4 * 10 * 10; i += 4) {
                                    block.data[i] = newVal;
                                    block.data[i + 1] = newVal;
                                    block.data[i + 2] = newVal;
                                    block.data[i + 3] = 255;
                                }
                                context.putImageData(block, x * 10, y * 10);

                                thumbnail.data[(y * 28 + x) * 4] = newVal;
                                thumbnail.data[(y * 28 + x) * 4 + 1] = newVal;
                                thumbnail.data[(y * 28 + x) * 4 + 2] = newVal;
                                thumbnail.data[(y * 28 + x) * 4 + 3] = 255;
                            }
                        }
                    }
                    thumbnailCtx.putImageData(thumbnail, 0, 0);
                    this.setState({
                        result: net.run(nnInput2),
                    })
                    // console.log(net.run(nnInput2))
                }}>
                    wat is?
                </button>
                <button type="button" onClick={() => {
                    this.saveCanvas.clear()
                }}>clear
                </button>
                <canvas style={{'margin': '10px 50px', 'border': '1px red solid'}}
                        width="28" height="28" ref={small => this.smallCanvas = small}></canvas>
                {/*{max_el}*/}
                {result}
            </div>
        )
    }
}

export default MainBody