import CollectionFactory from '../foundation/collection-factory';
import { Request } from './models.js';
import { Comment } from '../comment/models';


export const RequestCollection = CollectionFactory(Request, {

  makeRequestComment(data) {
    const { message, requestId, userId, id } = data;

    if (!requestId) {
      throw new TypeError(`requestId is required to create a request comment`);
    }

    if (!userId) {
      throw new TypeError(`userId is required to create a request comment`);
    }

    const attributes = {
      commentableType: Request.forge().tableName,
      commentableId: requestId,
      userId,
      message,
    };

    if (id) {
      attributes.id = id;
    }

    return Comment.forge(attributes);
  },
});


export const RequestCommentCollection = CollectionFactory(Comment);
