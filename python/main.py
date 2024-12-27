import modal
import os
import hmac

app = modal.App('claude-at-home-sandboxes')

@app.function(secrets=[modal.Secret.from_name('custom-secret')])
@modal.web_endpoint(method="POST")
def handler(body: dict):

  # Use timing-safe comparison
  if not hmac.compare_digest(os.environ['CLAUDE_AT_HOME_SECRET'], str(body['secret'])):
    raise ValueError('Invalid secret')

  if body['type'] == 'create_sandbox':        
    image = modal.Image.debian_slim()

    if 'apt_packages' in body and body['apt_packages']:
      image = image.apt_install(*body['apt_packages'])    
    if 'pip_packages' in body and body['pip_packages']:
      image = image.pip_install(*body['pip_packages'])

    sb = modal.Sandbox.create(app=app, image=image)
    return {'sandbox_id': sb.object_id}

  if body['type'] == 'terminate_sandbox':
    sb = modal.Sandbox.from_id(body['sandbox_id'])
    sb.terminate()
    return {'status': 'success'}

  if body['type'] == 'exec_command':
    sb = modal.Sandbox.from_id(body['sandbox_id'])
    p = sb.exec(*body['command'])
    p.wait()
    return {
      'returncode': p.returncode,
      'stdout': p.stdout.read(),
      'stderr': p.stderr.read(),
    }  

  if body['type'] == 'read_file':
    sb = modal.Sandbox.from_id(body['sandbox_id'])
    with sb.open(body['path'], 'r') as f:
      return {
        'contents': f.read(),        
      }

  if body['type'] == 'write_file':
    sb = modal.Sandbox.from_id(body['sandbox_id'])
    with sb.open(body['path'], 'w') as f:
      f.write(body['contents'])
    return {'status': 'success'}
    


    
    

