-- Function to delete old KYC files
create or replace function delete_old_kyc_files()
returns trigger as $$
declare
  old_file_path text;
begin
  -- If updating document_front
  if TG_OP = 'UPDATE' and NEW.document_front is distinct from OLD.document_front then
    -- Extract file path from the old URL
    old_file_path := substr(OLD.document_front, position('kyc_documents/' in OLD.document_front));
    
    -- Delete the old file
    if old_file_path is not null then
      delete from storage.objects
      where bucket_id = 'kyc_documents'
      and name = old_file_path;
    end if;
  end if;

  -- If updating document_back
  if TG_OP = 'UPDATE' and NEW.document_back is distinct from OLD.document_back then
    -- Extract file path from the old URL
    old_file_path := substr(OLD.document_back, position('kyc_documents/' in OLD.document_back));
    
    -- Delete the old file
    if old_file_path is not null then
      delete from storage.objects
      where bucket_id = 'kyc_documents'
      and name = old_file_path;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger for file cleanup
drop trigger if exists cleanup_kyc_files on kyc;
create trigger cleanup_kyc_files
  before update on kyc
  for each row
  execute function delete_old_kyc_files();

-- Add policy to allow deletion of storage objects
create policy "Allow users to delete their own KYC documents"
  on storage.objects for delete
  using (
    bucket_id = 'kyc_documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
