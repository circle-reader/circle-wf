import Base from './base.class.js';

export default class PublishProject extends Base {
  constructor() {
    super('publish');
  }

  process() {
    return Promise.reject('暂未实现，敬请期待');
  }
}
