export default function NoticiasPage() {
  return (
    <div id="main">
      <h1>Novedades y Noticias</h1>

      <div className="article">
        <h2>25 de Junio del 2014 — Google I/O 2014</h2>
        <div className="article-meta">25 de Junio del 2014</div>
        <div className="article-body">
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
        </div>
      </div>

      <div className="article">
        <h2>Hackear con un simple SMS</h2>
        <div className="article-meta">15 de Junio del 2014</div>
        <div className="article-body">
          <p>
            El pasado 15 de junio, se detectó una vulnerabilidad grave que permitía reiniciar los
            móviles Wiko remotamente con un simple SMS con el símbolo "igual" (=).
            La compañía propietaria de los dispositivos inteligentes (Wiko) ha dicho que remediará
            pronto esta vulnerabilidad lanzando una actualización.
            La vulnerabilidad está afectando a más terminales chinos, los que incorporan el chipset MediaTek.
          </p>
          <p>El listado de dispositivos móviles de los cuales se ha detectado que son vulnerables:</p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li>Wiko Stairway</li>
            <li>Wiko Darkmoon</li>
            <li>Wiko Dark Side</li>
            <li>Wiko Darknight</li>
            <li>Wiko Iggy</li>
            <li>Wiko Ozzy</li>
            <li>Wiko Darfull</li>
            <li>Wiko Cink King</li>
            <li>Wiko Cink Five</li>
            <li>Wiko Cink Peax</li>
            <li>Wiko Cink Peax 2</li>
            <li>Wiko Cink Slim</li>
            <li>Alcatel One Touch Idol X</li>
            <li>Alcatel One Touch Idol Ultra</li>
            <li>Alcatel One Touch 997D</li>
            <li>Alcatel One Touch Pop C3 (4033D)</li>
            <li>Alcatel One Touch S-Pop (4030D)</li>
            <li>Alcatel One Touch Star (6010D)</li>
            <li>Zopo ZP950</li>
            <li>Acer Liquid E 2 DUO</li>
            <li>Fairphone</li>
            <li>Archos 40 Titanium</li>
          </ul>
        </div>
      </div>

      <div className="article">
        <h2>Comienza el Gamelab</h2>
        <div className="article-meta">25 de Junio del 2014</div>
        <div className="article-body">
          <p>
            Comienza el Gamelab, la feria internacional del videojuego y ocio interactivo.
            La feria está situada en la filmoteca de Catalunya los días 25, 26, 27 de junio.
          </p>
        </div>
      </div>

      <div className="article">
        <h2>Descubren un Android con malware de fábrica</h2>
        <div className="article-meta">24 de Junio del 2014</div>
        <div className="article-body">
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
        </div>
      </div>

      <div className="article">
        <h2>Correos fraudulentos</h2>
        <div className="article-body">
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
        </div>
      </div>

      <div className="article">
        <h2>Oleadas de SMS</h2>
        <div className="article-body">
          <p>
            Nueva oleada de mensajes SMS que te dicen que has recibido un paquete y que tienes que
            llamar a un número de teléfono de tarificación adicional.
          </p>
          <p><strong>¡NO PIQUES!</strong></p>
        </div>
      </div>

      <div className="article">
        <h2>Windows 8.1 Update 2</h2>
        <div className="article-body">
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
        </div>
      </div>

      <div className="article">
        <h2>Grave vulnerabilidad de Windows</h2>
        <div className="article-body">
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
        </div>
      </div>

      <div className="article">
        <h2>Virus de la policía</h2>
        <div className="article-body">
          <p>
            La nueva variante del virus de la policía utiliza al recientemente coronado rey Felipe VI.
          </p>
        </div>
      </div>

      <div className="article" style={{ borderBottom: 'none' }}>
        <h2>Facebook ha caído</h2>
        <div className="article-body">
          <p>
            Facebook ha caído esta mañana entre las 10:00 y la 11:00 Hora Española.
          </p>
        </div>
      </div>
    </div>
  );
}
