export const MATTER_MODULE_ID = 'physics-demos';

export const MATTER_CATEGORIES = [
  {
    id: 'motion', title: '材料与运动', symbol: '↗',
    description: '改变阻力、摩擦与重力，观察物体怎样运动。',
    examples: ['airFriction', 'friction', 'staticFriction', 'restitution', 'gravity', 'timescale']
  },
  {
    id: 'mechanics', title: '机械与经典实验', symbol: '⚖',
    description: '探索吊桥、摆、小车与弹弓，发现力的传递。',
    examples: ['bridge', 'car', 'catapult', 'slingshot', 'newtonsCradle', 'doublePendulum', 'wreckingBall', 'gyro']
  },
  {
    id: 'shapes', title: '形状与堆叠', symbol: '▰',
    description: '堆叠不同形状，看看碰撞、支撑和地形的影响。',
    examples: ['mixed', 'stack', 'circleStack', 'compound', 'compoundStack', 'pyramid', 'avalanche', 'ballPool', 'rounded', 'concave', 'svg', 'terrain']
  },
  {
    id: 'flexible', title: '柔性与约束', symbol: '⌁',
    description: '拖动布料、链条和软体，观察连接怎样改变运动。',
    examples: ['cloth', 'softBody', 'ragdoll', 'chains', 'constraints']
  },
  {
    id: 'development', title: '开发与呈现', symbol: '⌖',
    description: '由老师陪同，探索碰撞检测、画面与运行方式。',
    examples: ['collisionFiltering', 'compositeManipulation', 'events', 'manipulation', 'raycasting', 'remove', 'renderResize', 'sensors', 'sleeping', 'sprites', 'stats', 'stress', 'stress2', 'stress3', 'stress4', 'substep', 'views']
  }
];

export function matterCategoryFor(example) {
  return MATTER_CATEGORIES.find(category => category.examples.includes(example));
}
