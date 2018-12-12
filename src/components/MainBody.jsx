import React from 'react';
import CanvasDraw from 'react-canvas-draw'
import '../container.css'
import brain from 'brain.js'
import trainData from '../assets/data/mnistTrain.json'

// const net = new brain.NeuralNetwork();
// net.fromJSON(trainData);

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

    net = new brain.NeuralNetwork()

    centerImage = (img) => {
        let meanX = 0;
        let meanY = 0;
        let rows = img.length;
        let columns = img[0].length;
        let sumPixels = 0;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                let pixel = (1 - img[y][x]);
                sumPixels += pixel;
                meanY += y * pixel;
                meanX += x * pixel;
            }
        }
        meanX /= sumPixels;
        meanY /= sumPixels;

        let dY = Math.round(rows / 2 - meanY);
        let dX = Math.round(columns / 2 - meanX);
        return {transX: dX, transY: dY};
    }

    getBoundingRectangle = (img, threshold) => {
        let rows = img.length;
        let columns = img[0].length;
        let minX = columns;
        let minY = rows;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
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
    toByteArrayIn28 = (grayscaleImg) => {
        let nnInput = []
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
        return nnInput

    }
    $28ByteCodeToImage = (context /* контекст главного*/, thumbnail /* 28*28 image canv*/, nnInput) => {
        let nnInput2 = []
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
        return {
            thumbnail: thumbnail,
            nnInput2: nnInput2
        }
    }
    knowingImageFromCanvas = () => {
        let context = this.saveCanvas.ctx.drawing //контекст реакт канвы (основная)
        let image = context.getImageData(0, 0,
            this.saveCanvas.canvas.drawing.width, this.saveCanvas.canvas.drawing.height) // побитовый массив
        let grayscaleImg = this.imageDataToGrayscale(image) //перевод полученного изображения в сервый
        let boundingRectangle = this.getBoundingRectangle(grayscaleImg, 0.01); //серое изображение ограничивается квадратом
        let trans = this.centerImage(grayscaleImg) //поиск центра массы для центрирования
        //скрытая канва
        this.hiddenCanvas.width = image.width
        this.hiddenCanvas.height = image.height
        let copyCtx = this.hiddenCanvas.getContext('2d') // её контекст
        let brW = boundingRectangle.maxX + 1 - boundingRectangle.minX; //ширина по центрированным значениям
        let brH = boundingRectangle.maxY + 1 - boundingRectangle.minY; //высота по центрированным значениям
        let scaling = 190 / (brW > brH ? brW : brH); // масштаб
        // масштабьирование и перенос
        copyCtx.translate(this.saveCanvas.canvas.drawing.width / 2, this.saveCanvas.canvas.drawing.height / 2);
        copyCtx.scale(scaling, scaling);
        copyCtx.translate(-this.saveCanvas.canvas.drawing.width / 2, -this.saveCanvas.canvas.drawing.height / 2);
        // translate to center of mass
        copyCtx.translate(trans.transX, trans.transY);

        copyCtx.drawImage(context.canvas, 0, 0); //орисовка изображения центрировааного в невидмой копии
        image = copyCtx.getImageData(0, 0, 280, 280);  // присвоение побитового массива сс невидимой канвы основной канве
        grayscaleImg = this.imageDataToGrayscale(image); //перевод в 255.255.255

        let nnInput = this.toByteArrayIn28(grayscaleImg) // перегон значений в 28х28

        let thumbnailCtx = this.smallCanvas.getContext('2d') // контекст маленькой канвы
        let thumbnail = thumbnailCtx.getImageData(0, 0, 28, 28); //битовый массив маленькой канвы
        this.saveCanvas.clear() //очистка основной канвы
        context.drawImage(this.hiddenCanvas.getContext('2d').canvas, 0, 0); //отрисовка со скрытой канвы в основной

        let resultBy28Byte = this.$28ByteCodeToImage(context, thumbnail, nnInput)
        thumbnail = resultBy28Byte.thumbnail
        let nnInput2 = resultBy28Byte.nnInput2 //получение побитвого массива 28*28
        thumbnailCtx.putImageData(thumbnail, 0, 0); //отрисовка 28*28 канвы
        this.setState({ //скормили нейронке
            result: this.net.run(nnInput2),
        })
    }

    imageDataToGrayscale = (imgData) => {
        let grayscaleImg = [];
        for (let y = 0; y < imgData.height; y++) {
            grayscaleImg[y] = [];
            for (let x = 0; x < imgData.width; x++) {
                let offset = y * 4 * imgData.width + 4 * x;
                let alpha = imgData.data[offset + 3];
                // console.log(alpha, 'alp')
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
                grayscaleImg[y][x] = imgData.data[y * 4 * imgData.width + x * 4] / 255;
            }
        }
        return grayscaleImg;
    }


    componentDidMount() {
        this.net.fromJSON(trainData)
    }

    renderMax() { //max element index + %
        let max = Math.max(...this.state.result)
        return (
            this.state.result.length ? (
                <ul>
                    <li> max:{this.state.result.findIndex(el => el === max)} => {max}%</li>
                </ul>) : 'Almost empty'
        )
    }

    render() {
        let result = this.state.result ? this.state.result.map((_, index) => {
            return (
                <li key={index}> {index} => {_}</li>
            )
        }) : '';
        /*todo красива, вывести индекс и выбранное число с вероятностями */
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
                        style={{display: 'none'}}/>
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
                <button type="button" className={"btn btn-success"} onClick={this.knowingImageFromCanvas}>
                    what's happen?
                </button>
                <button type="button" className={"btn btn-danger"} onClick={() => {
                    this.saveCanvas.clear()
                }}>clear
                </button>
                <canvas style={{'margin': '10px 50px', 'border': '1px red solid'}}
                        width="28" height="28" ref={small => this.smallCanvas = small}/>
                {this.renderMax()}
                {result}
            </div>
        )
    }
}

export default MainBody