# Necessário ter esse import pra funcionar (pip install opencv-python)
# Documentação: https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html // https://docs.opencv.org/4.x/dd/d43/tutorial_py_video_display.html
import cv2
import os
from datetime import datetime

from compressor import compress_video
from aws_buckets import upload_to_s3
from dotenv import load_dotenv

load_dotenv()

AF_ACCESS_KEY = os.getenv('AF_ACCESS_KEY')
AF_SECRET_KEY = os.getenv('AF_SECRET_KEY')

today = datetime.now().strftime("%Y%m%d")

# Formatação rtsp://user:password@ip_address:port/cam/realmonitor?channel=1&subtype=0
url = 'rtsp://admin:Wt123456@192.168.1.162:554/cam/realmonitor?channel=1&subtype=0'

# Cap aqui é um objeto contendo o acesso a câmera
cap = cv2.VideoCapture(url)

filename = 'liveCamTest/camera.avi'
fourcc = cv2.VideoWriter_fourcc(*'XVID')                                                  #-- Isso aqui é pra definir o Codec
out = cv2.VideoWriter(filename=filename, fourcc=fourcc, fps=30.0, frameSize=(1280, 720))  #-- especificações do video, tipo nome de saida, codec, fps e resolução

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print("Erro: Não foi possível receber o frame (parou a stream?).")
        break

    out.write(frame)

    cv2.imshow('Stream de Video', frame)
    if cv2.waitKey(1) == ord('q') | ord('Q'):
        break

cap.release()
out.release()
cv2.destroyAllWindows()

compressed_name = 'liveCamTest/camera_comprimida.mp4'
compression = compress_video(input_path=filename, output_path=compressed_name, resolution='640x360', fps=10, bitrate='500k')

if compression:
    os.remove(filename)

upload_to_s3(AF_ACCESS_KEY, AF_SECRET_KEY, compressed_name, 'bucket-teste-camera1', f'frontcam_{today}.mp4')