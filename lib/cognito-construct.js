const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { AuthFlow, UserPool, UserPoolAttribute, UserPoolClient, SignInType } = require('@aws-cdk/aws-cognito');

/**
 * @typedef {Object}  CognitoPoolOptions
 */

class CognitoPool extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {CognitoPoolOptions=} options
     */
    constructor(scope, id, options) {
        super(scope, id);

        //const {} = options;

        const userPool = new UserPool(this, 'userPool', {
            userPoolName: 'awsciPool',
            autoVerifiedAttributes: [UserPoolAttribute.EMAIL],
            signInType: SignInType.EMAIL,

        });

        new cdk.CfnOutput(this, 'CognitoEndpointURL', { value: userPool.userPoolProviderUrl, description: "The URL of the Cognito Endpoint" });

        const userPoolClient = new UserPoolClient(this, 'userPoolClient', {
            generateSecret: false,
            enabledAuthFlows: [AuthFlow.USER_PASSWORD],
            userPool: userPool,
            userPoolClientName: 'awsciWebClient'
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId, description: 'The ID of the UserPool Client'})

    }



}

module.exports = { CognitoPool };