import os
import zipfile
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
from django.conf import settings

@csrf_exempt
def upload_file(request):
    if request.method == 'POST':
        try:
            file = request.FILES['file']
            file_path = os.path.join(settings.MEDIA_ROOT, file.name)
            
            # Create media directory if it doesn't exist
            os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
            
            # Save the file
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            return HttpResponse('File uploaded successfully')
        except Exception as e:
            return HttpResponse(f'Error uploading file: {str(e)}', status=500)
    
    return HttpResponse('Method not allowed', status=405)

@csrf_exempt
def download_favorites(request):
    if request.method == 'POST':
        try:
            # Get the list of favorite files from the request
            data = json.loads(request.body)
            favorite_files = data.get('favorites', [])
            
            if not favorite_files:
                return HttpResponse('没有选择任何文件', status=400)
            
            # Create a temporary zip file
            zip_filename = 'favorites.zip'
            zip_path = os.path.join(settings.MEDIA_ROOT, zip_filename)
            
            # Create the media directory if it doesn't exist
            os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
            
            # Create the zip file
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for filename in favorite_files:
                    file_path = os.path.join(settings.MEDIA_ROOT, filename)
                    print(f"Checking file: {file_path}")  # Debug print
                    if os.path.exists(file_path):
                        print(f"File exists: {file_path}")  # Debug print
                        # Add file to zip with its original name
                        zipf.write(file_path, os.path.basename(file_path))
                    else:
                        print(f"File not found: {file_path}")  # Debug print
            
            # Check if any files were added to the zip
            if os.path.getsize(zip_path) == 0:
                os.remove(zip_path)
                return HttpResponse('没有找到可下载的文件', status=404)
            
            # Read the zip file and send it as a response
            with open(zip_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type='application/zip')
                response['Content-Disposition'] = f'attachment; filename={zip_filename}'
            
            # Clean up the temporary zip file
            os.remove(zip_path)
            
            return response
            
        except Exception as e:
            print(f"Error in download_favorites: {str(e)}")
            return HttpResponse(f'Error: {str(e)}', status=500)
    
    return HttpResponse('Method not allowed', status=405) 