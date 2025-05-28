import os
import boto3
from botocore.exceptions import NoCredentialsError

def liveupload_to_s3(access_key, secret_key, file_path, bucket_name, s3_filename):

    try:
        s3 = boto3.client('s3', aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name='sa-east-1')

        if file_path.endswith('.m3u8'):
            content_type = 'application/vnd.apple.mpegurl'
        elif file_path.endswith('.ts'):
            content_type = 'video/MP2T'
        else:
            return
        
        s3.upload_file(file_path, bucket_name, s3_filename, ExtraArgs={'ContentType': content_type})

        return True
    
    except NoCredentialsError:
        print(f"Erro: Não foi possível validar as credenciais (as chaves estão corretas?).")
        return False
    
    except Exception as e:
        print(f"Erro ao tentar o Upload para a S3: {e}")
        return False

def create_temp_url(access_key, secret_key, bucket_name, s3_filename, active_time=60):
    
    try:
        s3 = boto3.client('s3', aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name='sa-east-1')
        temp_url = s3.generate_presigned_url('get_object', Params={'Bucket': bucket_name, 'Key': s3_filename}, ExpiresIn=active_time)

        return temp_url
    
    except Exception as e:
        return "[ERRO AO GERAR URL TEMPORÁRIA] - " + e