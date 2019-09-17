const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const cfn = require('@aws-cdk/aws-cloudformation');
const iam = require('@aws-cdk/aws-iam');
const lambda = require('@aws-cdk/aws-lambda');
const { HostedZone } = require('@aws-cdk/aws-route53');

/**
 * @typedef UserPoolDomainOptions
 * @property {UserPoolCustomResourceOptions} customResourceOptions - The options for creating the custom resource
 * @property {string} userPoolArn                                  - The ARN of the user pool
 * @property {string} assetCodePath                                - The ZIP archive to upload
 * @property {string} handler                                      - The name of the handler
 */

/**
 * @typedef  UserPoolCustomResourceOptions
 * @property {string} certificateArn   - ARN of the certificate to use
 * @property {string} authDomain       - The domain name to use for this user pool
 * @property {string} baseDomain       - The domain for the hosted zone
 * @property {string} userPoolId       - The ID of the user pool
 * @property {string} userPoolClientId - The ID of the User Pool Client
 * @property {string} callbackUrl      - The callback URL cognito should use
 * @property {string} logoutUrl        - The logout URL for cognito
 */

class UserPoolDomain extends Construct {
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {UserPoolDomainOptions} options
   */
  constructor(scope, id, options) {
    super(scope, id);

    const userPoolDomainLambda = new lambda.SingletonFunction(this, 'UserPoolDomainLambda', {
      uuid: '4adc734e-2514-4d27-97c5-af2167df061c',
      code: new lambda.AssetCode(options.assetCodePath),
      handler: options.handler,
      timeout: cdk.Duration.seconds(300),
      runtime: lambda.Runtime.GO_1_X,
      functionName: 'UserPoolDomainLambda'
    });

    const zone = HostedZone.fromLookup(this, "zone", {
      domainName: options.customResourceOptions.baseDomain,
    });

    userPoolDomainLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [options.userPoolArn],
      actions: [
        'cognito-idp:createUserPoolDomain',
        'cognito-idp:updateUserPoolDomain',
        'cognito-idp:deleteUserPoolDomain',
        'cognito-idp:updateUserPoolClient'
      ]
    }));

    userPoolDomainLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        'cloudfront:updateDistribution',
        'route53:ListHostedZonesByName',
        'cognito-idp:describeUserPoolDomain'
      ]
    }));

    userPoolDomainLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['arn:aws:route53:::' + zone.hostedZoneId.substr(1)],
      actions: ['route53:ChangeResourceRecordSets']
    }));

    new cfn.CustomResource(this, "customResource", {
      provider: cfn.CustomResourceProvider.lambda(userPoolDomainLambda),
      properties: options.customResourceOptions
    });

  }

}
module.exports = { UserPoolDomain };