const { Bucket } = require('@aws-cdk/aws-s3');
const cdk = require('@aws-cdk/core');
const { Stack, RemovalPolicy } = require('@aws-cdk/core');
const { Code, Runtime, Function } = require('@aws-cdk/aws-lambda');
const path = require('path');

class AwsciStack extends Stack {
  /**
   * @param {cdk.App} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);

    new Bucket(this, 'AwsciBucket', {
      bucketName: 'boobie-bucket-999',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new Function(this, 'MyFunction', {
      runtime: Runtime.GO_1_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../lambda-handler')),
    });
    Code.
    console.log(Runtime)
  }
}

module.exports = { AwsciStack };