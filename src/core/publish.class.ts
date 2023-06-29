import Task from './task.class.js';

export default class PublishProject extends Task {
  constructor(args: any) {
    super({ name: 'publishProject', args });
  }

  process() {
    return Promise.reject('No implementation yet, so stay tuned');
  }
}
