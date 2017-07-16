import AbstractError from 'node-custom-errors';


export const NotImplementedError = AbstractError.create('Not Implemented Error');

export const NotFoundError = AbstractError.create('Not Found Error');

export const InputError = AbstractError.create('Input Error');

export const GenerationError = AbstractError.create('Generation Error');

export const PayloadError = AbstractError.create('Payload Error');

export const QueryError = AbstractError.create('Query Error');

export const IncludeError = AbstractError.create('Include Error');

export const FilterError = AbstractError.create('Filter Error');

export const ValiationError = AbstractError.create('Validation Error');

export const SerializationError = AbstractError.create('Serialization Error');

export const NormalizationError = AbstractError.create('Normalization Error');

export const AuthenticationError = AbstractError.create('Authentication Error');

export const SoftDeleteError = AbstractError.create('Soft Delete Error');

export const ExpirationError = AbstractError.create('Expiration Error');

export const StateError = AbstractError.create('State Error');

export const ModelRelationshipError = AbstractError.create('Model Relationship Error');

export const ModelBelongsToError = AbstractError.create('Model Belongs To Error');

export const ModelHasManyError = AbstractError.create('Model Has Many Error');

export const DatabaseSaveError = AbstractError.create('Database Save Error');

export const DatabaseSeedError = AbstractError.create('Database Seed Error');

export const DatabaseTransactionError = AbstractError.create('Database Save Error');

export const DatabaseRelationError = AbstractError.create('Database Relation Error');

export const DatabaseUniquenessError = AbstractError.create('Database Uniqueness Error');

export const HTTPRequestError = AbstractError.create('HTTP Request Error');

export const StatusCodeNotFoundError = AbstractError.create('Status Code Not Found Error');

export const StatusCodeBadRequestError = AbstractError.create('Status Code Bad Request Error');

export const StatusCodeBadDataError = AbstractError.create('Status Code Bad Data Error');

export const StatusCodeConflictError = AbstractError.create('Status Code Conflict Error');

export const StatusCodeUnauthorizedError = AbstractError.create('Status Code Unauthorized Error');

export const StatusCodeError = AbstractError.create('Status Code Error');
