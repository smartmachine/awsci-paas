const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { AuthFlow, CfnUserPool, UserPoolAttribute, CfnUserPoolClient } = require('@aws-cdk/aws-cognito');
const { StringParameter } = require('@aws-cdk/aws-ssm');

const { UserPoolDomain } = require("./userpool-domain");

/**
 * @typedef {Object}  CognitoPoolOptions
 * @property {string} certificateArn - The certificate ARN to user with the domain
 * @property {string} authDomain     - The custom domain for the cognito pool
 * @property {string} baseDomain     - The base domain for the hosted zone
 * @property {string} callbackUrl    - The callback url for cognito
 * @property {string} logoutUrl      - The logout url for cognito
 */

class CognitoPool extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {CognitoPoolOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    const { certificateArn, authDomain, baseDomain, callbackUrl, logoutUrl } = options;

    const userPool = new CfnUserPool(this, 'userPool', {
      userPoolName:           'awsciPool',
      autoVerifiedAttributes: [UserPoolAttribute.EMAIL],
      usernameAttributes:     [UserPoolAttribute.EMAIL],
      schema: [
        {
          name: UserPoolAttribute.NAME,
          required: true
        },
        {
          name: UserPoolAttribute.FAMILY_NAME,
          required: true
        },
        {
          name: UserPoolAttribute.PREFERRED_USERNAME,
          required: false
        }
      ],
    });

    this._userPoolArn = userPool.attrArn;


    new cdk.CfnOutput(this, 'CognitoEndpointURL', { value: userPool.attrProviderUrl, description: "The URL of the Cognito Endpoint" });

    const userPoolClient = new CfnUserPoolClient(this, 'userPoolClient', {
      generateSecret:     false,
      explicitAuthFlows:  [AuthFlow.USER_PASSWORD],
      userPoolId:         userPool.ref,
      clientName:         'awsciWebClient'
    });

    this._clientIdParameter = new StringParameter(this, 'clientIdParameter', {
      parameterName: '/cognito/client/id',
      stringValue: userPoolClient.ref,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.ref, description: 'The ID of the UserPool Client'});

    new UserPoolDomain(this, "userPoolDomain", {
      customResourceOptions: {
        certificateArn:   certificateArn,
        baseDomain:       baseDomain,
        authDomain:       authDomain,
        userPoolId:       userPool.ref,
        userPoolClientId: userPoolClient.ref,
        callbackUrl:      callbackUrl,
        logoutUrl:        logoutUrl
      },
      userPoolArn:   userPool.attrArn,
      assetCodePath: '../api/cloudformation-cognito.zip',
      handler:       'cloudformation-cognito'
    });
  }

  get clientIdParameter() {
    return this._clientIdParameter;
  }

  get userPoolArn() {
    return this._userPoolArn;
  }
}

module.exports = { CognitoPool };
