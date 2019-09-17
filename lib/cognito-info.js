const { Construct } = require('@aws-cdk/core');
const { RestApi, Resource, JsonSchemaType } = require('@aws-cdk/aws-apigateway');

const { LambdaApi} = require('./lambda-api');

/**
 * @typedef CognitoInfoOptions
 * @property {RestApi}  api
 * @property {Resource} resource
 */

class CognitoInfo extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {CognitoInfoOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    const lambdaApi = new LambdaApi(this, 'CognitoInfo', {
      api:                     options.api,
      resource:                options.resource,
      handler:                 'cognito-info',
      requestTemplate:         '{}',
      responseTemplate:        '{"state": "ok", "clientId": $input.json("$.client_id"), "callbackURL": $input.json("$.callback_url")}',
      errorResponseTemplate:   '{"state": "error", "message": $input.path("$.errorMessage")}',
      requestModelProperties:  null,
      responseModelProperties: {
        clientId:   { type: JsonSchemaType.STRING },
        callbackURL: { type: JsonSchemaType.STRING }
      },
      errorResponseModelProperties: {
        state:   { type: JsonSchemaType.STRING },
        message: { type: JsonSchemaType.STRING }
      },
      resourceName:              'info',
      validateRequestBody:       false,
      validateRequestParameters: false,
      httpMethod:                'GET'
    });

    this._lambda = lambdaApi;
  }

  get lambda() {
    return this._lambda;
  }
}

module.exports = { CognitoInfo };