import { useState } from 'react';

const articles = [
  {
    id: 1,
    year: 2026,
    category: 'Tecnología',
    title: 'Google I/O 2026: Gemini llega a todo el ecosistema con Android 17 y nuevas laptops IA',
    date: '20 de Mayo del 2026',
    source: { label: 'El Androide Libre', url: 'https://www.elespanol.com/elandroidelibre/noticias-y-novedades/20260424/revolucion-google-io-anos-importantes-android-compania/1003744220946_0.html' },
    body: (
      <>
        <p>
          El Google I/O 2026 se celebra los días 19 y 20 de mayo en Mountain View, California, y
          Google lo describe como "uno de los años más importantes para Android". El eje central es
          la expansión de Gemini Intelligence a prácticamente todo el ecosistema: Android, ChromeOS
          y los servicios de Google.
        </p>
        <p><strong>Android Auto completamente renovado con navegación 3D en tiempo real.</strong></p>
        <p>
          Gemini se integra en Android Auto con una nueva interfaz Material 3 Expressive y la función
          Immersive Navigation: navegación 3D con señales de tráfico, visualización de carriles y
          datos del entorno en tiempo real.
        </p>
        <p><strong>Googlebooks: una nueva categoría de laptops para Gemini.</strong></p>
        <p>
          Google presentó Googlebooks, portátiles diseñadas desde cero para funcionar con Gemini
          Intelligence. Acer, Asus, Dell, HP y Lenovo lanzarán los primeros modelos en otoño de 2026.
        </p>
      </>
    ),
  },
  {
    id: 2,
    year: 2026,
    category: 'IA',
    title: 'Anthropic supera a OpenAI en adopción empresarial por primera vez',
    date: '15 de Mayo del 2026',
    source: { label: 'Infobae', url: 'https://www.infobae.com/estados-unidos/2026/05/15/la-pelea-por-la-ia-ya-tiene-ganador-no-es-el-que-todos-pensaban/' },
    body: (
      <>
        <p>
          En un hito histórico, Anthropic ha superado a OpenAI en adopción empresarial en Estados
          Unidos. El 34,4 % de las empresas estadounidenses pagan por Claude frente al 32,3 % que
          lo hacen por ChatGPT. En solo doce meses, Anthropic cuadruplicó su adopción: del 9 % en
          mayo de 2025 al 34,4 % en abril de 2026.
        </p>
        <p>
          El principal motor de este crecimiento ha sido Claude Code, la herramienta de programación
          agéntica de Anthropic, descrita como el producto de crecimiento más rápido en la historia
          de la compañía. Empresas de defensa como Lockheed Martin y fondos financieros como
          Bridgewater han optado por Claude por sus capacidades de privacidad y cumplimiento normativo.
        </p>
      </>
    ),
  },
  {
    id: 3,
    year: 2026,
    category: 'Tecnología',
    title: 'The Android Show 2026: Android se convierte en un "sistema de inteligencia"',
    date: '12 de Mayo del 2026',
    source: { label: 'TechCrunch', url: 'https://techcrunch.com/2026/05/12/everything-google-announced-at-its-android-show-from-googlebooks-to-vibe-coded-widgets/' },
    body: (
      <>
        <p>
          Google celebró "The Android Show: I/O Edition 2026" el 12 de mayo, donde anunció que
          Android deja de ser un sistema operativo tradicional para convertirse en un "sistema de
          inteligencia". El protagonista es Gemini Intelligence, capaz de entender el contexto de
          la pantalla y completar tareas complejas de varios pasos de forma autónoma.
        </p>
        <p>
          Entre las novedades: emojis tridimensionales "Noto 3D", la herramienta de transcripción
          Rambler que elimina muletillas y organiza frases automáticamente, y generación de widgets
          personalizados para la pantalla de inicio mediante IA generativa. También llega Quick Share
          para transferir archivos de Android a iOS mediante código QR.
        </p>
      </>
    ),
  },
  {
    id: 4,
    year: 2026,
    category: 'Ciberseguridad',
    title: 'Patch Tuesday de mayo 2026: 120 vulnerabilidades corregidas y Xbox Mode para todos',
    date: '13 de Mayo del 2026',
    source: { label: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/news/microsoft/microsoft-may-2026-patch-tuesday-fixes-120-flaws-no-zero-days/' },
    body: (
      <>
        <p>
          Microsoft publicó el Patch Tuesday de mayo de 2026, que incluye parches para 120
          vulnerabilidades, 17 de ellas clasificadas como Críticas (14 de ejecución remota de
          código). En esta ocasión no se detectó ningún zero-day siendo explotado activamente.
        </p>
        <p>
          La actualización también trae Xbox Mode para todos los usuarios de Windows 11: un panel
          de juego a pantalla completa controlable con mando que convierte cualquier PC o laptop en
          una consola. Además se añade soporte para formatear unidades FAT32 de hasta 2 TB, frente
          al antiguo límite de 32 GB.
        </p>
        <p>
          <strong>Atención:</strong> los certificados originales de Secure Boot emitidos en 2011
          caducan el 26 de junio de 2026. Los dispositivos que no reciban la actualización
          entrarán en un estado de seguridad degradado.
        </p>
      </>
    ),
  },
  {
    id: 5,
    year: 2026,
    category: 'Ciberseguridad',
    title: 'Vulnerabilidad crítica de 18 años en NGINX permite ejecución remota de código',
    date: '13 de Mayo del 2026',
    source: { label: 'CybersecurityNews', url: 'https://cybersecuritynews.com/18-year-old-nginx-rce-vulnerability/' },
    body: (
      <>
        <p>
          F5 publicó un aviso urgente sobre CVE-2026-42945, un fallo de desbordamiento de búfer
          presente en NGINX desde 2008 —18 años— que permite la ejecución remota de código sin
          autenticación. La vulnerabilidad recibió una puntuación CVSS de 9,2 sobre 10.
        </p>
        <p>
          Los administradores de sistemas deben actualizar a NGINX 1.30.1 o 1.31.0 de inmediato.
          En paralelo, CISA añadió a su catálogo de vulnerabilidades conocidas un bypass de
          autenticación crítico en Cisco Catalyst SD-WAN con puntuación CVSS de 10.0, con fecha
          límite de remediación el 17 de mayo.
        </p>
        <p>
          El informe M-Trends 2026 de Mandiant advierte que el 28,3 % de los CVEs publicados en
          el último año fueron explotados activamente dentro de las primeras 24 horas de su divulgación.
        </p>
      </>
    ),
  },
  {
    id: 6,
    year: 2026,
    category: 'Gaming',
    title: 'Xbox confirma que su próxima consola está "bien encaminada"; Nintendo Switch 2 lidera las portátiles',
    date: 'Mayo del 2026',
    source: { label: 'T3', url: 'https://www.t3.com/tech/gaming-consoles/our-next-console-is-well-underway-xbox-drops-bombshell-announcement-as-it-confirms-2026-plans-and-beyond' },
    body: (
      <>
        <p>
          Microsoft confirmó que la siguiente consola Xbox está "bien encaminada" y que la compañía
          tiene planes concretos para 2026 y más allá. No se revelaron especificaciones ni fecha
          de lanzamiento, pero el anuncio marca un punto de inflexión para la división Xbox.
        </p>
        <p>
          En el segmento portátil, el Nintendo Switch 2 sigue dominando el mercado como el
          dispositivo más recomendado de 2026, gracias a su retrocompatibilidad con casi toda la
          biblioteca del Switch original. Rumores apuntan a que Sony estaría retrasando la PS6
          por problemas de suministro, con posible lanzamiento en Navidad de 2027.
        </p>
      </>
    ),
  },
  {
    id: 17,
    year: 2026,
    category: 'Tecnología',
    title: 'Apple Smart Glasses: la carrera por las gafas inteligentes se intensifica de cara a 2027',
    date: '20 de Abril del 2026',
    source: { label: 'AppleInsider', url: 'https://appleinsider.com/articles/26/04/20/smart-glasses-race-heats-up-as-apple-prepares-for-late-2026-entry' },
    body: (
      <>
        <p>
          Apple planea lanzar sus primeras gafas inteligentes para finales de 2026, según reportes de
          Mark Gurman de Bloomberg. El producto se enfocará en cámaras integradas, altavoces,
          micrófonos y una versión mejorada de Siri con capacidades contextuales avanzadas, pero sin
          pantalla integrada en su versión inicial. Llevará el chip interno N401, derivado de la
          serie S del Apple Watch, y estará diseñado para funcionar como accesorio del iPhone.
        </p>
        <p>
          Apple apuesta por un enfoque pragmático similar al de las Ray-Ban Meta: privilegiar el uso
          cotidiano sobre las capacidades de realidad aumentada. Las opciones incluirán cuatro diseños
          de montura en acetato en colores negro, azul océano y marrón claro. Las capacidades
          esperadas incluyen captura de fotos y vídeo espacial, navegación por voz, traducción en
          tiempo real e identificación de objetos mediante visión IA.
        </p>
        <p>
          La presentación oficial se espera para septiembre u octubre de 2026, durante el evento del
          iPhone 18, con lanzamiento al público general en 2027.
        </p>
      </>
    ),
  },
  {
    id: 18,
    year: 2026,
    category: 'IA',
    title: 'OpenAI lanza GPT-5.5 Instant como nuevo modelo predeterminado de ChatGPT',
    date: '5 de Mayo del 2026',
    source: { label: 'TechCrunch', url: 'https://techcrunch.com/2026/05/05/openai-releases-gpt-5-5-instant-a-new-default-model-for-chatgpt/' },
    body: (
      <>
        <p>
          OpenAI lanzó el 5 de mayo GPT-5.5 Instant como el nuevo modelo predeterminado de ChatGPT,
          reemplazando a GPT-5.3 Instant. La compañía afirma que el nuevo modelo reduce un 52,5 % las
          afirmaciones alucinadas en áreas de alta sensibilidad como derecho, medicina y finanzas,
          manteniendo la baja latencia de su predecesor. En benchmarks, alcanzó 81,2 puntos en
          AIME 2025 (frente al 65,4 anterior).
        </p>
        <p>
          Una de las novedades más destacadas es la personalización mejorada: el modelo puede acceder
          a conversaciones previas, archivos subidos y datos de Gmail conectado para ofrecer
          respuestas contextualizadas. Esta funcionalidad se lanza primero para usuarios Plus y Pro.
          Las respuestas son un 30 % más concisas. En el API, el modelo está disponible como
          <code> chat-latest</code>.
        </p>
      </>
    ),
  },
  {
    id: 19,
    year: 2026,
    category: 'IA',
    title: 'xAI lanza Grok 4.3 con precios agresivos, vídeo nativo y suite de clonación de voz',
    date: '6 de Mayo del 2026',
    source: { label: 'Artificial Analysis', url: 'https://artificialanalysis.ai/articles/xai-launches-grok-4-3-with-improved-agentic-performance-and-lower-pricing' },
    body: (
      <>
        <p>
          xAI lanzó oficialmente Grok 4.3 el 6 de mayo, un modelo frontera que incluye contexto
          nativo de 1 millón de tokens, entrada de vídeo, generación de diapositivas directamente
          en el chat e integración con SharePoint. El modelo se posiciona agresivamente en precio:
          1,25 dólares por millón de tokens de entrada, significativamente por debajo de modelos
          comparables de OpenAI y Google.
        </p>
        <p>
          En benchmarks, Grok 4.3 alcanzó el primer lugar en CaseLaw v2 y CorpFin, posicionándose
          especialmente para tareas legales y financieras. xAI también lanzó una Speech-to-Text API
          en disponibilidad general, con soporte para 25 idiomas en modo batch y streaming e
          identificación de múltiples hablantes con etiquetado temporal a nivel de palabra.
        </p>
      </>
    ),
  },
  {
    id: 20,
    year: 2026,
    category: 'Ciberseguridad',
    title: 'CISA añade Cisco SD-WAN CVE-2026-20182 al catálogo KEV: puntuación CVSS 10.0',
    date: '15 de Mayo del 2026',
    source: { label: 'The Hacker News', url: 'https://thehackernews.com/2026/05/cisa-adds-cisco-sd-wan-cve-2026-20182.html' },
    body: (
      <>
        <p>
          CISA agregó el 15 de mayo CVE-2026-20182 a su catálogo de Vulnerabilidades Conocidas
          Explotadas, con puntuación CVSS de 10.0 — la máxima posible. El fallo afecta al Cisco
          Catalyst SD-WAN Controller y permite a un atacante remoto no autenticado saltarse
          completamente la autenticación y obtener privilegios administrativos. Las agencias
          federales civiles tenían hasta el 17 de mayo para aplicar los parches.
        </p>
        <p>
          Cisco atribuyó la explotación activa al grupo UAT-8616, que ha intentado agregar claves
          SSH, modificar configuraciones de red y escalar privilegios en infraestructuras afectadas.
          Al menos 10 clusters de amenaza distintos han sido identificados explotando
          vulnerabilidades relacionadas desde marzo de 2026, desplegando shells web, mineros XMRig
          y herramientas de robo de credenciales.
        </p>
      </>
    ),
  },
  {
    id: 21,
    year: 2026,
    category: 'Ciberseguridad',
    title: 'Microsoft Exchange Server: CVE-2026-42897 explotado activamente vía correo manipulado',
    date: '15 de Mayo del 2026',
    source: { label: 'The Hacker News', url: 'https://thehackernews.com/2026/05/on-prem-microsoft-exchange-server-cve.html' },
    body: (
      <>
        <p>
          Microsoft divulgó CVE-2026-42897 (CVSS 8.1), una vulnerabilidad de suplantación en
          versiones locales de Exchange Server. El fallo tiene su origen en XSS: un atacante envía
          un correo especialmente manipulado que, al ser abierto en Outlook Web Access, ejecuta
          código JavaScript arbitrario en el navegador. Afecta a Exchange Server 2016, 2019 y
          Subscription Edition en instalaciones locales; Exchange Online no está impactado.
        </p>
        <p>
          CISA incorporó esta vulnerabilidad a su catálogo KEV y fijó el 29 de mayo como fecha
          límite para las agencias federales. El vector de ataque por correo electrónico sin
          autenticación previa eleva el riesgo para cualquier organización con Exchange on-premises,
          ya que no requiere que la víctima haga clic en ningún enlace externo.
        </p>
      </>
    ),
  },
  {
    id: 22,
    year: 2026,
    category: 'Ciberseguridad',
    title: 'Fallo crítico en Apache HTTP/2 (CVE-2026-23918) permite DoS y posible ejecución remota',
    date: '5 de Mayo del 2026',
    source: { label: 'The Hacker News', url: 'https://thehackernews.com/2026/05/critical-apache-http2-flaw-cve-2026.html' },
    body: (
      <>
        <p>
          La Apache Software Foundation publicó actualizaciones de seguridad para corregir
          CVE-2026-23918 (CVSS 8.8) en Apache HTTP Server. El fallo es un "double free y posible
          RCE" en el manejo del protocolo HTTP/2: cuando un cliente envía un frame HEADERS seguido
          de un RST_STREAM con código de error distinto de cero, se produce una doble liberación
          de memoria. Afecta a Apache HTTP Server 2.4.66 y fue corregido en la versión 2.4.67.
        </p>
        <p>
          La denegación de servicio es trivial de explotar en cualquier servidor con mod_http2
          habilitado. La ejecución remota de código requiere que el servidor use Apache Portable
          Runtime con asignador mmap, configuración predeterminada en sistemas Debian y en la
          imagen oficial de Docker. Los administradores deben actualizar a la versión 2.4.67
          de inmediato.
        </p>
      </>
    ),
  },
  {
    id: 23,
    year: 2026,
    category: 'Gaming',
    title: 'Subnautica 2 entra en Early Access con cooperativo para 4 jugadores',
    date: '14 de Mayo del 2026',
    source: { label: 'PC Gamer', url: 'https://subnautica2.gg/news/subnautica-2-early-access-launches-may-14-2026/' },
    body: (
      <>
        <p>
          Subnautica 2 de Unknown Worlds Entertainment entró en Early Access el 14 de mayo a las
          17:00 hora española, disponible en Steam, Epic Games Store, Windows Store y Xbox Series
          X|S, incluyendo Xbox Game Pass. El precio de lanzamiento es de 29,99 dólares. La gran
          novedad respecto al original es el modo cooperativo de hasta cuatro jugadores, la primera
          vez que la serie incorpora multijugador.
        </p>
        <p>
          El juego incluye un planeta oceánico alien completamente nuevo con entornos más amplios,
          nuevas criaturas, construcción de bases avanzada y mecánicas de exploración expandidas.
          PS5 y Nintendo Switch 2 no forman parte del lanzamiento en Early Access. El estudio
          estima que el juego permanecerá en acceso anticipado entre dos y tres años.
        </p>
      </>
    ),
  },
  {
    id: 24,
    year: 2026,
    category: 'Gaming',
    title: 'Forza Horizon 6 lanza con 92 en Metacritic: el juego mejor valorado de 2026',
    date: '19 de Mayo del 2026',
    source: { label: 'Windows Central', url: 'https://www.windowscentral.com/gaming/forza/playground-does-it-again-our-forza-horizon-6-review-roundup-points-to-a-major-win-for-the-legacy-racing-franchise' },
    body: (
      <>
        <p>
          Forza Horizon 6 de Playground Games lanzó el 19 de mayo para Xbox Series X|S y PC con
          aclamación universal: 92 en Metacritic y 91 en OpenCritic a partir de más de 60 reseñas,
          convirtiéndose en el juego mejor valorado de 2026 hasta la fecha. IGN le otorgó un 10/10,
          describiendo el mapa abierto de Japón como "un parque de atracciones para coches que
          recompensa la exploración".
        </p>
        <p>
          El juego está disponible en Xbox Game Pass Ultimate desde el día de lanzamiento. Una
          versión para PlayStation 5 fue confirmada pero sin fecha concreta. El éxito del título
          refuerza la apuesta de Microsoft por las exclusivas de alto perfil en 2026.
        </p>
      </>
    ),
  },
  {
    id: 25,
    year: 2026,
    category: 'Gaming',
    title: '007 First Light de IO Interactive confirma lanzamiento para el 27 de mayo y alcanza estado Gold',
    date: '14 de Mayo del 2026',
    source: { label: 'Push Square', url: 'https://www.pushsquare.com/news/2026/05/007-first-light-now-ready-for-action-james-bond-ps5-game-goes-gold' },
    body: (
      <>
        <p>
          IO Interactive, desarrolladora de la saga Hitman, anunció que 007 First Light ha
          alcanzado el estado "Gold" con lanzamiento fijado el 27 de mayo en PS5, Xbox Series X|S
          y PC. Una versión para Nintendo Switch 2 llega más adelante. El título sigue a un James
          Bond de 26 años en una narrativa original inspirada en las novelas de Ian Fleming,
          explorando cómo el agente 006 se convierte en el legendario 007.
        </p>
        <p>
          La certificación Gold semanas antes del lanzamiento fue bien recibida, interpretándose
          como señal de un desarrollo sin problemas técnicos de última hora. Con Forza Horizon 6
          el 19 de mayo y 007 First Light el 27 de mayo, la segunda quincena de mayo es una de
          las más cargadas en lanzamientos AAA del año.
        </p>
      </>
    ),
  },
  {
    id: 7,
    title: '25 de Junio del 2014 — Google I/O 2014',
    date: '25 de Junio del 2014',
    body: (
      <>
        <p>
          Hoy tendrá comienzo la "feria para desarrolladores" de Google, la cual durará hasta el 26 de
          junio. En ella, no sólo los desarrolladores tendrán cabida, sino también los usuarios de
          teléfonos inteligentes, tabletas, relojes inteligentes y otro tipo de dispositivos
          tecnológicos. Durante el Google I/O, se espera una serie de novedades importantes.
        </p>
        <p><strong>Android Wear, el plato fuerte de Google en el I/O 2014</strong></p>
        <p>
          Uno de los puntos fuertes que llegará de la mano de Android Wear, además de una interfaz
          simplificada, adaptada y basada principalmente en el lenguaje de voz con Google Now.
          Será el momento de presentar las primeras pantallas redondas.
        </p>
        <p><strong>Android 5.0: Rediseño en interfaz y software base.</strong></p>
        <p>
          La nueva versión de Android podría llegar con el nombre Android 5.0 o con otro nombre.
          Una de las principales novedades será la consola virtual ART junto con unos cambios en la interfaz.
        </p>
        <p><strong>Google Glass: Supuesto lanzamiento oficial.</strong></p>
        <p>
          Las gafas de google llevan varios años en fase de pruebas, se prevé que se informe del
          lanzamiento oficial en el evento.
        </p>
        <p><strong>Chromecast 2:</strong></p>
        <p>
          En el evento podríamos conocer la segunda generación del Chromecast. Este pequeño
          dispositivo -stick HDMI- convierte nuestros televisores con entrada de HDMI en televisores
          inteligentes y, además, permite compartir diferentes tipos de contenido entre el teléfono
          inteligente y el televisor.
        </p>
        <p><strong>Proyecto ARA.</strong></p>
        <p>
          El proyecto ARA consta de dispositivos modulares por un precio estimado de 50€. El proyecto
          no será presentado en el evento.
        </p>
      </>
    ),
  },
  {
    id: 8,
    title: 'Hackear con un simple SMS',
    date: '15 de Junio del 2014',
    body: (
      <>
        <p>
          El pasado 15 de junio, se detectó una vulnerabilidad grave que permitía reiniciar los
          móviles Wiko remotamente con un simple SMS con el símbolo "igual" (=).
          La compañía propietaria de los dispositivos inteligentes (Wiko) ha dicho que remediará
          pronto esta vulnerabilidad lanzando una actualización.
          La vulnerabilidad está afectando a más terminales chinos, los que incorporan el chipset MediaTek.
        </p>
        <p>El listado de dispositivos móviles de los cuales se ha detectado que son vulnerables:</p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li>Wiko Stairway</li><li>Wiko Darkmoon</li><li>Wiko Dark Side</li>
          <li>Wiko Darknight</li><li>Wiko Iggy</li><li>Wiko Ozzy</li>
          <li>Wiko Darfull</li><li>Wiko Cink King</li><li>Wiko Cink Five</li>
          <li>Wiko Cink Peax</li><li>Wiko Cink Peax 2</li><li>Wiko Cink Slim</li>
          <li>Alcatel One Touch Idol X</li><li>Alcatel One Touch Idol Ultra</li>
          <li>Alcatel One Touch 997D</li><li>Alcatel One Touch Pop C3 (4033D)</li>
          <li>Alcatel One Touch S-Pop (4030D)</li><li>Alcatel One Touch Star (6010D)</li>
          <li>Zopo ZP950</li><li>Acer Liquid E 2 DUO</li>
          <li>Fairphone</li><li>Archos 40 Titanium</li>
        </ul>
      </>
    ),
  },
  {
    id: 9,
    title: 'Comienza el Gamelab',
    date: '25 de Junio del 2014',
    body: (
      <p>
        Comienza el Gamelab, la feria internacional del videojuego y ocio interactivo.
        La feria está situada en la filmoteca de Catalunya los días 25, 26, 27 de junio.
      </p>
    ),
  },
  {
    id: 10,
    title: 'Descubren un Android con malware de fábrica',
    date: '24 de Junio del 2014',
    body: (
      <>
        <p>
          La firma alemana G Data acaba de informar de la existencia de un Smartphone Android
          fabricado en China que incorpora malware de fábrica. El programa espía no se puede
          eliminar y se conecta con un servidor anónimo localizado en China.
        </p>
        <p>
          Según G Data el Smartphone "incorpora un peligroso programa espía disfrazado de Google
          Play que forma parte del conjunto de aplicaciones instaladas de serie en el teléfono
          inteligente. El spyware funciona en segundo plano y no puede ser detectado por los
          usuarios del dispositivo."
        </p>
        <p>
          Sin saberlo, envían los datos personales a un servidor localizado en China y permite
          instalar otras aplicaciones maliciosas, controlar la cámara y el micrófono.
          El modelo infectado es el N9500 del fabricante chino Star.
        </p>
        <p>
          Se ha descubierto una aplicación maliciosa que imita a la Google Play (la tienda oficial
          de Android). El aspecto es exacto a la aplicación oficial de Android, lo que dificulta
          ser diferenciada con la oficial. Al abrir la aplicación, comienza a mostrarnos todo tipo
          de mensajes relacionados con errores, después de los cuales ya no podemos detener el
          proceso, ni desinstalar la aplicación. Mientras enseña esos mensajes la aplicación roba
          todos los datos bancarios y los guarda en un servidor para venderlos en el mercado negro.
        </p>
      </>
    ),
  },
  {
    id: 11,
    title: 'Correos fraudulentos',
    date: '',
    body: (
      <>
        <p>
          Se sabe que hay más de 6.500 correos electrónicos fraudulentos correspondientes a la
          misma campaña de phishing con ofertas de empleo falsas, que utilizan diferentes asuntos
          con el fin de dificultar su detección.
        </p>
        <p>Los mensajes son mandados desde las direcciones:</p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontFamily: 'monospace' }}>
          <li>crp.es[@]inbox.com</li>
          <li>sso.madrid[@]gmx.com</li>
          <li>es.saisoninc[@]outlook.com</li>
          <li>ssnspain[@]mail.com</li>
          <li>crdtmail[@]aol.com</li>
        </ul>
      </>
    ),
  },
  {
    id: 12,
    title: 'Oleadas de SMS',
    date: '',
    body: (
      <>
        <p>
          Nueva oleada de mensajes SMS que te dicen que has recibido un paquete y que tienes que
          llamar a un número de teléfono de tarificación adicional.
        </p>
        <p><strong>¡NO PIQUES!</strong></p>
      </>
    ),
  },
  {
    id: 13,
    title: 'Windows 8.1 Update 2',
    date: '',
    body: (
      <>
        <p>
          Una nueva actualización de Windows 8.1, la "Update 2", estaría siendo preparada para
          lanzarse el próximo mes de septiembre. Su peso alcanzaría los 3 GB y llegaría sin el
          menú de inicio característico del sistema operativo de Microsoft.
        </p>
        <p>
          Con Windows 8.1 Update 2, en base a las filtraciones, se espera que lleguen importantes
          novedades al sistema operativo. Por una parte, se espera que se introduzcan novedades
          relacionadas con la adaptación a pantallas táctiles y, por otro lado, también podría
          finalmente producirse la esperada llegada de Cortana, el asistente virtual de Microsoft.
        </p>
      </>
    ),
  },
  {
    id: 14,
    title: 'Grave vulnerabilidad de Windows',
    date: '',
    body: (
      <>
        <p>
          Microsoft ha confirmado, a través de un comunicado, que una serie de productos
          anti-malware incorporados por defecto están afectados por una vulnerabilidad crítica que
          podría permitir a un atacante desactivar por completo la protección e infectar el
          ordenador con ayuda de un sitio web. Por el momento no se conoce ningún tipo de software
          que aproveche esta vulnerabilidad.
        </p>
        <p>
          El software vulnerable es: "Forefront Client Security", "Security Essentials",
          "Windows Defender" e "Intune Endpoint Protection".
        </p>
        <p>
          Según las indicaciones de Microsoft, los usuarios no deberían tomar ningún tipo de
          medida; la compañía de Redmond desplegará una actualización generalizada durante las
          próximas 48 horas para resolver la vulnerabilidad.
        </p>
      </>
    ),
  },
  {
    id: 15,
    title: 'Virus de la policía',
    date: '',
    body: (
      <p>
        La nueva variante del virus de la policía utiliza al recientemente coronado rey Felipe VI.
      </p>
    ),
  },
  {
    id: 16,
    title: 'Facebook ha caído',
    date: '',
    body: (
      <p>Facebook ha caído esta mañana entre las 10:00 y la 11:00 Hora Española.</p>
    ),
  },
];

const CATEGORIES = ['Todas', 'Tecnología', 'IA', 'Ciberseguridad', 'Gaming'];

export default function NoticiasPage({ siteVersion }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const visible = siteVersion === '2014'
    ? articles.filter((a) => !a.year || a.year === 2014)
    : articles;

  const byCat = activeCategory === 'Todas'
    ? visible
    : visible.filter((a) => a.category === activeCategory);

  const filtered = query.trim()
    ? byCat.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.date.toLowerCase().includes(query.toLowerCase())
      )
    : byCat;

  return (
    <div id="main">
      <h1>Novedades y Noticias</h1>

      {siteVersion !== '2014' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setActiveCategory(cat); setQuery(''); }}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  cursor: 'pointer',
                  border: '1px solid',
                  borderRadius: '3px',
                  borderColor: activeCategory === cat ? '#1982d1' : '#ccc',
                  background: activeCategory === cat ? '#1982d1' : '#f5f5f5',
                  color: activeCategory === cat ? '#fff' : '#444',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="search"
              placeholder="Buscar noticias..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '13px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            {query.trim() && (
              <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{query}"
              </p>
            )}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <p style={{ color: '#888', fontSize: '13px' }}>No se encontraron noticias.</p>
      )}

      {filtered.map((article, index) => (
        <div
          className="article"
          key={article.id}
          style={index === filtered.length - 1 ? { borderBottom: 'none' } : undefined}
        >
          <h2>{article.title}</h2>
          <div className="article-meta">
            {siteVersion !== '2014' && article.category && (
              <span style={{
                display: 'inline-block',
                marginRight: '8px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                background: '#1982d1',
                color: '#fff',
                borderRadius: '2px',
                verticalAlign: 'middle',
              }}>{article.category}</span>
            )}
            {article.date}
            {article.source && (
              <> · Fuente: <a href={article.source.url} target="_blank" rel="noopener noreferrer">{article.source.label}</a></>
            )}
          </div>
          <div className="article-body">{article.body}</div>
        </div>
      ))}
    </div>
  );
}
