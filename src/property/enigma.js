import {
  defaults as Defaults,
} from 'lodash';
import Request from 'request-promise';
import {
  RequestError as RPRequestError,
  StatusCodeError as RPStatusCodeError,
} from 'request-promise/errors';
import {
  HTTPRequestError,
  StatusCodeNotFoundError,
  StatusCodeBadRequestError,
  StatusCodeBadDataError,
  StatusCodeConflictError,
  StatusCodeUnauthorizedError,
  StatusCodeError,
} from '../foundation/errors';
import { EnigmaError } from './errors';
import Config from 'config';


/**
 * Enigma
 *
 * Enigma provides an interface to communicate with the enigma app. Engima is
 * simply a wrapper around the request HTTP library.
 */
export default function enigma({ config = Config, request = Request } = {}) {
  const host = config.get('enigma.host');
  const authToken = config.get('enigma.authToken');
  const client = request.defaults({
    headers: {
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${authToken}`,
    },
  });


  function makeUrl(path) {
    return `${host}/${path}`;
  }

  function handleErrors(err) {
    if (err instanceof RPStatusCodeError && err.statusCode === 400) {
      throw new StatusCodeBadRequestError();
    }

    if (err instanceof RPStatusCodeError && err.statusCode === 401) {
      throw new StatusCodeUnauthorizedError();
    }

    if (err instanceof RPStatusCodeError && err.statusCode === 404) {
      throw new StatusCodeNotFoundError();
    }

    if (err instanceof RPStatusCodeError && err.statusCode === 409) {
      throw new StatusCodeConflictError();
    }

    if (err instanceof RPStatusCodeError && err.statusCode === 422) {
      throw new StatusCodeBadDataError();
    }

    if (err instanceof RPStatusCodeError && err.statusCode === 500) {
      throw new StatusCodeError();
    }

    if (err instanceof RPRequestError) {
      // TODO(digia): Capture the information from the original error
      throw new HTTPRequestError();
    }

    throw new EnigmaError();
  }


  function get(path, opts = {}) {
    const url = makeUrl(path);
    const options = Defaults(opts, { json: true });

    return client.get(url, options)
    .catch(handleErrors);
  }

  function post(path, data, opts = {}) {
    const url = makeUrl(path);
    const options = Defaults(opts, {
      body: data,
      json: true,
    });

    return client.post(url, options)
    .catch(handleErrors);
  }

  function del(path, opts = {}) {
    const url = makeUrl(path);

    return client.del(url, opts)
    .catch(handleErrors);
  }

  return { get, post, del };
}
