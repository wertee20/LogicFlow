import { h, Component } from 'preact';
import GraphModel from '../../model/GraphModel';
import { ElementState, EventType } from '../../constant/constant';
import { StepDrag } from '../../util/drag';
// import getTransform from './getTransformHoc';
import EventEmitter from '../../event/eventEmitter';
// import { GraphTransform } from '../../type';
import Dnd from '../behavior/DnD';
import { observer } from '../..';

type IProps = {
  graphModel: GraphModel;
  dnd: Dnd
};
type Istate = {
  isDraging: boolean,
};
// type InjectedProps = IProps & {
//   transformStyle: GraphTransform
// };
@observer
class CanvasOverlay extends Component<IProps, Istate> {
  stepDrag: StepDrag;
  stepScrollX = 0;
  stepScrollY = 0;
  constructor(props: IProps) {
    super();
    const { graphModel: { gridSize, eventCenter } } = props;
    this.stepDrag = new StepDrag({
      onDraging: this.onDraging,
      onDragEnd: this.onDragEnd,
      step: gridSize,
      eventType: 'BLANK',
      isStopPropagation: false,
      eventCenter,
      model: null,
    });
    // 当ctrl键被按住的时候，可以放大缩小。
    this.state = {
      isDraging: false,
    };
  }
  // get InjectedProps() {
  //   return this.props as InjectedProps;
  // }
  onDraging = ({ deltaX, deltaY }) => {
    this.setState({
      isDraging: true,
    });
    const {
      graphModel: {
        transformModel,
        editConfigModel,
      },
    } = this.props;
    if (editConfigModel.stopMoveGraph) {
      return;
    }
    transformModel.translate(deltaX, deltaY);
  };
  onDragEnd = () => {
    this.setState({
      isDraging: false,
    });
  };
  zoomHandler = (ev: WheelEvent) => {
    const { graphModel: { editConfigModel, transformModel, gridSize }, graphModel } = this.props;
    const { deltaX: eX, deltaY: eY } = ev;
    // 如果没有禁止滚动移动画布, 并且当前触发的时候ctrl键没有按住, 那么移动画布
    if (!editConfigModel.stopScrollGraph && ev.ctrlKey !== true) {
      ev.preventDefault();
      this.stepScrollX += eX;
      this.stepScrollY += eY;
      if (Math.abs(this.stepScrollX) >= gridSize) {
        const remainderX = this.stepScrollX % gridSize;
        const moveDistence = this.stepScrollX - remainderX;
        transformModel.translate(-moveDistence * transformModel.SCALE_X, 0);
        this.stepScrollX = remainderX;
      }
      if (Math.abs(this.stepScrollY) >= gridSize) {
        const remainderY = this.stepScrollY % gridSize;
        const moveDistenceY = this.stepScrollY - remainderY;
        transformModel.translate(0, -moveDistenceY * transformModel.SCALE_Y);
        this.stepScrollY = remainderY;
      }
      return;
    }
    // 如果没有禁止缩放画布，那么进行缩放. 在禁止缩放画布后，按住ctrl键也不能缩放了。
    if (!editConfigModel.stopZoomGraph) {
      ev.preventDefault();
      const position = graphModel.getPointByClient({
        x: ev.clientX,
        y: ev.clientY,
      });
      const { x, y } = position.canvasOverlayPosition;
      transformModel.zoom(ev.deltaY < 0, [x, y]);
    }
  };
  clickHandler = (ev: MouseEvent) => {
    // 点击空白处取消节点选中状态, 不包括冒泡过来的事件。
    const target = ev.target as HTMLElement;
    if (target.getAttribute('name') === 'canvas-overlay') {
      const { graphModel } = this.props;
      const { selectElements } = graphModel;
      if (selectElements.size > 0) {
        graphModel.clearSelectElements();
      }
      graphModel.eventCenter.emit(EventType.BLANK_CLICK, { e: ev });
    }
  };
  handleContextMenu = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    if (target.getAttribute('name') === 'canvas-overlay') {
      ev.preventDefault();
      const { graphModel } = this.props;
      const position = graphModel.getPointByClient({
        x: ev.clientX,
        y: ev.clientY,
      });
      // graphModel.setElementState(ElementState.SHOW_MENU, position.domOverlayPosition);
      graphModel.eventCenter.emit(EventType.BLANK_CONTEXTMENU, { e: ev, position });
    }
  };
  mouseDownHandler = (ev: MouseEvent) => {
    const {
      graphModel: {
        eventCenter,
        editConfigModel,
        transformModel: {
          SCALE_X,
        },
        gridSize,
      },
    } = this.props;
    const target = ev.target as HTMLElement;
    const isFrozenElement = !editConfigModel.adjustEdge && !editConfigModel.adjustNodePosition;
    if (target.getAttribute('name') === 'canvas-overlay' || isFrozenElement) {
      if (!editConfigModel.stopMoveGraph) {
        this.stepDrag.setStep(gridSize * SCALE_X);
        this.stepDrag.handleMouseDown(ev);
      } else {
        eventCenter.emit(EventType.BLANK_MOUSEDOWN, { e: ev });
      }
      // 为了处理画布移动的时候，编辑和菜单仍然存在的问题。
      this.clickHandler(ev);
    }
  };
  render() {
    const {
      graphModel: {
        transformModel,
      },
    } = this.props;
    const { transform } = transformModel.getTransformStyle();
    const { children, dnd } = this.props;
    const { isDraging } = this.state;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        name="canvas-overlay"
        onWheel={this.zoomHandler}
        onMouseDown={this.mouseDownHandler}
        onContextMenu={this.handleContextMenu}
        className={isDraging ? 'lf-canvas-overlay lf-dragging' : 'lf-canvas-overlay lf-drag-able'}
        {...dnd.eventMap()}
      >
        <g transform={transform}>
          {children}
        </g>
      </svg>
    );
  }
}

export default CanvasOverlay;
