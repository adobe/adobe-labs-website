const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const notFound = () => new Response(null, { status: 404, headers: jsonHeaders });
const error = () => new Response(null, { status: 500, headers: jsonHeaders });
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: jsonHeaders,
});

export { notFound, error, json };
