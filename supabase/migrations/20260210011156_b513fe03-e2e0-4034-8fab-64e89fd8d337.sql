UPDATE leave_requests 
SET attachment_url = '["' || attachment_url || '"]'
WHERE attachment_url IS NOT NULL 
  AND attachment_url != '' 
  AND attachment_url NOT LIKE '[%';