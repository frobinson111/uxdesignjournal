-- RPC function to create popup configs (bypasses PostgREST cache)
-- This function can be called immediately after creation

CREATE OR REPLACE FUNCTION create_popup_config(
  p_name TEXT,
  p_title TEXT,
  p_pdf_url TEXT,
  p_pdf_title TEXT,
  p_description TEXT DEFAULT '',
  p_image_url TEXT DEFAULT '',
  p_image_caption TEXT DEFAULT '',
  p_button_text TEXT DEFAULT 'Get Download Link',
  p_delay_seconds INTEGER DEFAULT 10,
  p_active BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_popup popup_configs;
BEGIN
  -- If setting as active, deactivate all others
  IF p_active THEN
    UPDATE popup_configs SET active = false;
  END IF;
  
  -- Insert new popup
  INSERT INTO popup_configs (
    name,
    title,
    description,
    image_url,
    image_caption,
    pdf_url,
    pdf_title,
    button_text,
    delay_seconds,
    active
  ) VALUES (
    p_name,
    p_title,
    p_description,
    p_image_url,
    p_image_caption,
    p_pdf_url,
    p_pdf_title,
    p_button_text,
    p_delay_seconds,
    p_active
  )
  RETURNING * INTO v_popup;
  
  -- Return as JSON in camelCase format for frontend
  RETURN json_build_object(
    'id', v_popup.id,
    'name', v_popup.name,
    'title', v_popup.title,
    'description', v_popup.description,
    'imageUrl', v_popup.image_url,
    'imageCaption', v_popup.image_caption,
    'pdfUrl', v_popup.pdf_url,
    'pdfTitle', v_popup.pdf_title,
    'buttonText', v_popup.button_text,
    'delaySeconds', v_popup.delay_seconds,
    'active', v_popup.active,
    'createdAt', v_popup.created_at,
    'updatedAt', v_popup.updated_at
  );
END;
$$;

-- Grant execute permission to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION create_popup_config TO authenticated;
GRANT EXECUTE ON FUNCTION create_popup_config TO anon;
GRANT EXECUTE ON FUNCTION create_popup_config TO service_role;
